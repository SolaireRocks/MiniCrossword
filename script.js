import { dailyPuzzle } from './puzzle-data.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyArpjA7oxqiJD4YyCDmMxhL5LpdBUvxyfQ",
    authDomain: "mini-crossword-a1649.firebaseapp.com",
    projectId: "mini-crossword-a1649",
    storageBucket: "mini-crossword-a1649.firebasestorage.app",
    messagingSenderId: "661167541092",
    appId: "1:661167541092:web:c17757b6d1dddede3ac871",
    measurementId: "G-SN8LGRHSH8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Game State & Variables ---
let currentUser = null;
let currentGrid = Array(5).fill().map(() => Array(5).fill(''));
let activeRow = 0;
let activeCol = 0;
let direction = 'across'; 
let timerInterval = null;
let startTime = null;
let finalSeconds = 0;
let isGameActive = false;
let isGameFinished = false;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const gameUI = document.getElementById('game-ui');
const startBtn = document.getElementById('start-btn');
const startDateDisplay = document.getElementById('start-date-display');
const boardEl = document.getElementById('game-board');
const acrossCluesList = document.getElementById('across-clues');
const downCluesList = document.getElementById('down-clues');
const activeClueText = document.getElementById('active-clue-text');
const timerEl = document.getElementById('timer');
const currentDateEl = document.getElementById('current-date');
const modal = document.getElementById('modal-overlay');
const finalTimeEl = document.getElementById('final-time');
const restartBtn = document.getElementById('restart-btn');

// Auth DOM
const googleLoginBtn = document.getElementById('google-login-btn');
const userDisplay = document.getElementById('user-display');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const signOutBtn = document.getElementById('sign-out-btn');
const leaderboardBody = document.getElementById('leaderboard-body');

// Mobile Keyboard Proxy
const inputProxy = document.createElement('input');
inputProxy.type = 'text';
inputProxy.style.position = 'absolute';
inputProxy.style.opacity = '0';
inputProxy.style.height = '0';
inputProxy.style.width = '0';
inputProxy.style.fontSize = '16px'; 
document.body.appendChild(inputProxy);

// --- 1. Authentication Logic ---

googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Login failed", error);
        alert("Login failed. Check console for details.");
    }
});

signOutBtn.addEventListener('click', () => {
    signOut(auth);
});

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        googleLoginBtn.style.display = 'none';
        userDisplay.style.display = 'flex'; // Changed to flex to align items
        userAvatar.src = user.photoURL;
        userName.textContent = user.displayName.split(' ')[0]; // First name only
    } else {
        googleLoginBtn.style.display = 'flex';
        userDisplay.style.display = 'none';
    }
});

// --- 2. Leaderboard Logic ---

function getTodayString() {
    // Returns a consistent date string for the database (e.g., "February 15, 2024")
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
}

async function fetchLeaderboard() {
    const todayStr = getTodayString();
    leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">Loading...</td></tr>`;

    try {
        const q = query(
            collection(db, "scores"),
            where("date", "==", todayStr),
            orderBy("timeInSeconds", "asc"),
            limit(10)
        );

        const querySnapshot = await getDocs(q);
        leaderboardBody.innerHTML = ''; // Clear loading

        if (querySnapshot.empty) {
            leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#888;">No scores yet today. Be the first!</td></tr>`;
            return;
        }

        let rank = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="rank-col">${rank}</td>
                <td class="name-col">
                    ${data.photoURL ? `<img src="${data.photoURL}" style="width:20px;height:20px;border-radius:50%;">` : ''}
                    ${data.displayName.split(' ')[0]}
                </td>
                <td class="time-col">${data.timeString}</td>
            `;
            leaderboardBody.appendChild(row);
            rank++;
        });

    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        leaderboardBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Error loading scores.</td></tr>`;
    }
}

async function saveScore() {
    if (!currentUser) return; // Only save if logged in

    const todayStr = getTodayString();
    
    try {
        await addDoc(collection(db, "scores"), {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            timeInSeconds: finalSeconds,
            timeString: finalTimeEl.textContent,
            date: todayStr,
            timestamp: new Date()
        });
        console.log("Score saved!");
    } catch (e) {
        console.error("Error adding score: ", e);
    }
}

// --- 3. Game Logic (Standard) ---

function initApp() {
    const todayStr = getTodayString();
    
    // Set date on both screens
    startDateDisplay.textContent = todayStr;
    currentDateEl.textContent = todayStr;

    // Load Leaderboard
    fetchLeaderboard();
}

function startGame() {
    // Reset State
    currentGrid = Array(5).fill().map(() => Array(5).fill(''));
    isGameActive = false;
    isGameFinished = false;
    clearInterval(timerInterval);
    timerEl.textContent = "00:00";
    modal.classList.add('hidden');

    // Render Game Elements
    renderBoard();
    renderClues();

    // UI Transitions
    startScreen.classList.add('hidden');
    gameUI.classList.add('visible');

    // Determine starting cell
    findStartingCell();
    updateHighlights();

    // Start Timer Immediately
    startTimer();
    
    // Focus Input
    inputProxy.focus();
}

function findStartingCell() {
    const solution = dailyPuzzle.solution;
    for(let r=0; r<5; r++) {
        for(let c=0; c<5; c++) {
            if(solution[r][c] !== '#') {
                activeRow = r;
                activeCol = c;
                return;
            }
        }
    }
}

function renderBoard() {
    boardEl.innerHTML = '';
    const solution = dailyPuzzle.solution;
    const gridNums = dailyPuzzle.gridNumbers;

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;

            if (solution[r][c] === '#') {
                cell.classList.add('black');
            } else {
                if (gridNums[r][c] !== 0) {
                    const numSpan = document.createElement('span');
                    numSpan.classList.add('cell-number');
                    numSpan.textContent = gridNums[r][c];
                    cell.appendChild(numSpan);
                }

                const contentSpan = document.createElement('span');
                contentSpan.classList.add('cell-content');
                cell.appendChild(contentSpan);

                cell.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    handleCellClick(r, c);
                });
            }
            boardEl.appendChild(cell);
        }
    }
}

function renderClues() {
    acrossCluesList.innerHTML = '';
    downCluesList.innerHTML = '';

    dailyPuzzle.clues.across.forEach((clue) => {
        const li = document.createElement('li');
        li.classList.add('clue-item');
        li.id = `clue-across-${clue.number}`;
        li.innerHTML = `<strong>${clue.number}</strong> ${clue.text}`;
        li.addEventListener('click', () => {
            direction = 'across';
            activeRow = clue.row;
            activeCol = clue.col;
            updateHighlights();
            focusInput();
        });
        acrossCluesList.appendChild(li);
    });

    dailyPuzzle.clues.down.forEach((clue) => {
        const li = document.createElement('li');
        li.classList.add('clue-item');
        li.id = `clue-down-${clue.number}`;
        li.innerHTML = `<strong>${clue.number}</strong> ${clue.text}`;
        li.addEventListener('click', () => {
            direction = 'down';
            activeRow = clue.row;
            activeCol = clue.col;
            updateHighlights();
            focusInput();
        });
        downCluesList.appendChild(li);
    });
}

function startTimer() {
    if (isGameActive) return;
    isGameActive = true;
    startTime = Date.now();
    timerInterval = setInterval(() => {
        finalSeconds = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(finalSeconds / 60).toString().padStart(2, '0');
        const secs = (finalSeconds % 60).toString().padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    isGameActive = false; 
}

function focusInput() {
    inputProxy.value = '';
    inputProxy.focus();
}

inputProxy.addEventListener('input', (e) => {
    if (isGameFinished) return;
    
    const char = e.target.value.slice(-1).toUpperCase();
    if (/[A-Z]/.test(char)) {
        currentGrid[activeRow][activeCol] = char;
        updateBoardUI();
        checkWin();
        moveFocus(1); 
    }
    inputProxy.value = '';
});

inputProxy.addEventListener('keydown', (e) => {
    if (isGameFinished) return;
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
    }

    switch (e.key) {
        case 'ArrowUp': navigate(-1, 0); break;
        case 'ArrowDown': navigate(1, 0); break;
        case 'ArrowLeft': navigate(0, -1); break;
        case 'ArrowRight': navigate(0, 1); break;
        case 'Backspace':
            if (currentGrid[activeRow][activeCol] !== '') {
                currentGrid[activeRow][activeCol] = '';
                updateBoardUI();
            } else {
                moveFocus(-1);
                currentGrid[activeRow][activeCol] = '';
                updateBoardUI();
            }
            break;
        case ' ':
            direction = direction === 'across' ? 'down' : 'across';
            updateHighlights();
            break;
    }
});

function handleCellClick(r, c) {
    if (activeRow === r && activeCol === c) {
        direction = direction === 'across' ? 'down' : 'across';
    } else {
        activeRow = r;
        activeCol = c;
    }
    updateHighlights();
    focusInput();
}

function navigate(rowDelta, colDelta) {
    let r = activeRow + rowDelta;
    let c = activeCol + colDelta;

    if (r >= 0 && r < 5 && c >= 0 && c < 5) {
        if (dailyPuzzle.solution[r][c] === '#') {
            r += rowDelta;
            c += colDelta;
        }
        if (r >= 0 && r < 5 && c >= 0 && c < 5 && dailyPuzzle.solution[r][c] !== '#') {
            activeRow = r;
            activeCol = c;
            updateHighlights();
        }
    }
}

function moveFocus(step) {
    let r = activeRow;
    let c = activeCol;
    let loops = 0;
    
    while(loops < 10) {
        if (direction === 'across') {
            c += step;
            if (c > 4) { c = 0; r++; } 
            else if (c < 0) { c = 4; r--; }
        } else {
            r += step;
            if (r > 4) { r = 0; c++; } 
            else if (r < 0) { r = 4; c--; }
        }
        
        if(r > 4) r = 0; if(r < 0) r = 4;
        if(c > 4) c = 0; if(c < 0) c = 4;

        if (dailyPuzzle.solution[r][c] !== '#') {
            activeRow = r;
            activeCol = c;
            break;
        }
        loops++;
    }
    updateHighlights();
}

function updateBoardUI() {
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if(dailyPuzzle.solution[r][c] === '#') continue;
            const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"] .cell-content`);
            cell.textContent = currentGrid[r][c];
            
            const cellDiv = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            if(currentGrid[r][c]) cellDiv.classList.add('filled');
            else cellDiv.classList.remove('filled');
        }
    }
}

function updateHighlights() {
    document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('active', 'highlight-word');
    });
    document.querySelectorAll('.clue-item').forEach(c => c.classList.remove('active'));

    const activeCell = document.querySelector(`.cell[data-row="${activeRow}"][data-col="${activeCol}"]`);
    if (activeCell) activeCell.classList.add('active');

    let wordStartRow = activeRow;
    let wordStartCol = activeCol;
    const solution = dailyPuzzle.solution;

    if (direction === 'across') {
        while(wordStartCol > 0 && solution[wordStartRow][wordStartCol - 1] !== '#') {
            wordStartCol--;
        }
        let c = wordStartCol;
        while(c < 5 && solution[wordStartRow][c] !== '#') {
            document.querySelector(`.cell[data-row="${wordStartRow}"][data-col="${c}"]`).classList.add('highlight-word');
            c++;
        }
        const clueObj = dailyPuzzle.clues.across.find(clue => clue.row === wordStartRow && clue.col === wordStartCol);
        activateClue(clueObj, 'across');
    } else {
        while(wordStartRow > 0 && solution[wordStartRow - 1][wordStartCol] !== '#') {
            wordStartRow--;
        }
        let r = wordStartRow;
        while(r < 5 && solution[r][wordStartCol] !== '#') {
            document.querySelector(`.cell[data-row="${r}"][data-col="${wordStartCol}"]`).classList.add('highlight-word');
            r++;
        }
        const clueObj = dailyPuzzle.clues.down.find(clue => clue.row === wordStartRow && clue.col === wordStartCol);
        activateClue(clueObj, 'down');
    }
}

function activateClue(clueObj, type) {
    if (!clueObj) return;
    const clueItem = document.getElementById(`clue-${type}-${clueObj.number}`);
    if (clueItem) {
        clueItem.classList.add('active');
        clueItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    activeClueText.innerHTML = `<strong>${clueObj.number}</strong> ${clueObj.text}`;
}

function checkWin() {
    let isComplete = true;
    let isCorrect = true;

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (dailyPuzzle.solution[r][c] === '#') continue;
            const val = currentGrid[r][c];
            const sol = dailyPuzzle.solution[r][c];
            if (val === '') isComplete = false;
            if (val !== sol) isCorrect = false;
        }
    }

    if (isComplete && isCorrect) {
        gameWon();
    }
}

function gameWon() {
    isGameFinished = true;
    stopTimer();
    finalTimeEl.textContent = timerEl.textContent;
    
    // SAVE SCORE TO FIREBASE
    saveScore();

    setTimeout(() => {
        modal.classList.remove('hidden');
    }, 300);
}

// --- Event Listeners ---

document.addEventListener('click', (e) => {
    if (!startScreen.classList.contains('hidden')) return;
    if (!modal.contains(e.target) && !e.target.classList.contains('primary-btn')) {
        if(isGameActive && !isGameFinished) inputProxy.focus();
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    // If we restart, we need to re-fetch leaderboard in case we just added our own score
    fetchLeaderboard();
    
    // Toggle UI back to start screen
    gameUI.classList.remove('visible');
    startScreen.classList.remove('hidden');
    
    // Wait a brief moment for transition then init
    setTimeout(() => {
        timerEl.textContent = "00:00";
    }, 500);
});

// Run on Load
initApp();