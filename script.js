import { dailyPuzzle } from './puzzle-data.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    doc, 
    getDoc, 
    setDoc,
    updateDoc,
    increment 
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

// --- Configuration ---
const MEDAL_THRESHOLDS = {
    GOLD: 30,   // Seconds (0:30)
    SILVER: 60  // Seconds (1:00)
};

const firebaseConfig = {
    apiKey: "AIzaSyArpjA7oxqiJD4YyCDmMxhL5LpdBUvxyfQ",
    authDomain: "mini-crossword-a1649.firebaseapp.com",
    projectId: "mini-crossword-a1649",
    storageBucket: "mini-crossword-a1649.firebasestorage.app",
    messagingSenderId: "661167541092",
    appId: "1:661167541092:web:c17757b6d1dddede3ac871",
    measurementId: "G-SN8LGRHSH8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Game State ---
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
const currentClueBar = document.getElementById('current-clue-bar'); // Mobile clue bar
const timerEl = document.getElementById('timer');
const currentDateEl = document.getElementById('current-date');
const modal = document.getElementById('modal-overlay');
const finalTimeEl = document.getElementById('final-time');
const restartBtn = document.getElementById('restart-btn');
const giveUpBtn = document.getElementById('give-up-btn');
const feedbackMessageEl = document.getElementById('feedback-message');

// Auth & Medals DOM
const googleLoginBtn = document.getElementById('google-login-btn');
const userDisplay = document.getElementById('user-display');
const userAvatar = document.getElementById('user-avatar');
const signOutBtn = document.getElementById('sign-out-btn');
const leaderboardBody = document.getElementById('leaderboard-body');
const nicknameInput = document.getElementById('nickname-input');
// New Elements
const medalCountsEl = document.getElementById('medal-counts');
const goldCountEl = document.getElementById('gold-count');
const silverCountEl = document.getElementById('silver-count');
const bronzeCountEl = document.getElementById('bronze-count');
const modalMedalIcon = document.getElementById('modal-medal-icon');
const modalMedalText = document.getElementById('modal-medal-text');

// Mobile Keyboard Proxy
const inputProxy = document.createElement('input');
inputProxy.type = 'text';
inputProxy.style.position = 'absolute';
inputProxy.style.opacity = '0';
inputProxy.style.height = '0';
inputProxy.style.width = '0';
inputProxy.style.fontSize = '16px'; 
document.body.appendChild(inputProxy);

// --- 1. Authentication & Profile Logic ---

googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Login failed", error);
    }
});

signOutBtn.addEventListener('click', () => {
    signOut(auth);
});

nicknameInput.addEventListener('change', async () => {
    if (!currentUser) return;
    const newName = nicknameInput.value.trim() || "Anonymous";
    try {
        await setDoc(doc(db, "users", currentUser.uid), {
            nickname: newName,
            lastUpdated: new Date()
        }, { merge: true });
    } catch (e) {
        console.error("Error updating nickname:", e);
    }
});

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        googleLoginBtn.style.display = 'none';
        userDisplay.style.display = 'flex';
        userAvatar.src = user.photoURL;

        // Fetch User Profile
        const userRef = doc(db, "users", user.uid);
        try {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const data = userSnap.data();
                nicknameInput.value = data.nickname || user.displayName.split(' ')[0];
                
                // Update Medal Counts in UI
                const medals = data.medals || { gold: 0, silver: 0, bronze: 0 };
                goldCountEl.textContent = medals.gold || 0;
                silverCountEl.textContent = medals.silver || 0;
                bronzeCountEl.textContent = medals.bronze || 0;
                medalCountsEl.style.display = 'flex';
                
            } else {
                // First time setup
                const defaultName = user.displayName.split(' ')[0];
                nicknameInput.value = defaultName;
                await setDoc(userRef, {
                    nickname: defaultName,
                    email: user.email,
                    realName: user.displayName,
                    medals: { gold: 0, silver: 0, bronze: 0 },
                    createdAt: new Date()
                });
                medalCountsEl.style.display = 'flex';
            }
        } catch (e) {
            console.error("Error fetching profile:", e);
        }
    } else {
        googleLoginBtn.style.display = 'flex';
        userDisplay.style.display = 'none';
        medalCountsEl.style.display = 'none'; // Hide medals if logged out
        nicknameInput.value = '';
    }
});

// --- 2. Leaderboard & Score Logic ---

function getTodayString() {
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
        leaderboardBody.innerHTML = ''; 

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
                    ${data.displayName}
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

// Determine Medal and Update Profile
async function processWin() {
    // 1. Determine Medal Type
    let medalType = 'bronze';
    let medalText = 'Bronze';
    let medalIcon = '🥉';

    if (finalSeconds <= MEDAL_THRESHOLDS.GOLD) {
        medalType = 'gold';
        medalText = 'Gold';
        medalIcon = '🥇';
    } else if (finalSeconds <= MEDAL_THRESHOLDS.SILVER) {
        medalType = 'silver';
        medalText = 'Silver';
        medalIcon = '🥈';
    }

    // 2. Update Modal UI
    modalMedalIcon.textContent = medalIcon;
    modalMedalText.innerHTML = `You got the <span style="color:var(--primary-color)">${medalText} Medal</span>!`;

    // 3. Save Score & Update Medals (if logged in)
    if (currentUser) {
        saveScore(medalType);
        updateUserMedals(medalType);
    }
}

async function updateUserMedals(medalType) {
    try {
        const userRef = doc(db, "users", currentUser.uid);
        // Atomic increment so we don't overwrite other data
        await updateDoc(userRef, {
            [`medals.${medalType}`]: increment(1)
        });
        
        // Update local UI immediately for immediate feedback on restart
        const countEl = document.getElementById(`${medalType}-count`);
        if(countEl) countEl.textContent = parseInt(countEl.textContent) + 1;
        
    } catch (e) {
        console.error("Error updating medals:", e);
    }
}

async function saveScore(medal) {
    const todayStr = getTodayString();
    let publicName = nicknameInput.value.trim() || "Anonymous";

    try {
        await addDoc(collection(db, "scores"), {
            uid: currentUser.uid,
            displayName: publicName,
            photoURL: currentUser.photoURL,
            timeInSeconds: finalSeconds,
            timeString: finalTimeEl.textContent,
            date: todayStr,
            medal: medal, // Save which medal they got with this specific score
            realName: currentUser.displayName,
            email: currentUser.email,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Error adding score: ", e);
    }
}

// --- 3. Game Logic ---

function initApp() {
    const todayStr = getTodayString();
    startDateDisplay.textContent = todayStr;
    currentDateEl.textContent = todayStr;
    fetchLeaderboard();
}

function startGame() {
    currentGrid = Array(5).fill().map(() => Array(5).fill(''));
    isGameActive = false;
    isGameFinished = false;
    clearInterval(timerInterval);
    timerEl.textContent = "00:00";
    modal.classList.add('hidden');
    giveUpBtn.style.display = 'block'; 
    feedbackMessageEl.classList.remove('visible');

    renderBoard();
    renderClues();

    startScreen.classList.add('hidden');
    gameUI.classList.add('visible');

    findStartingCell();
    updateHighlights();
    startTimer();
    inputProxy.focus();
}

function giveUp() {
    if (!confirm("Are you sure you want to give up? The solution will be revealed.")) {
        return;
    }

    isGameFinished = true;
    stopTimer();

    const solution = dailyPuzzle.solution;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (solution[r][c] !== '#') {
                currentGrid[r][c] = solution[r][c];
            }
        }
    }
    updateBoardUI();

    feedbackMessageEl.textContent = "Solution Revealed";
    feedbackMessageEl.classList.add('visible');
    giveUpBtn.style.display = 'none';
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

// Helper: Find first empty cell in the active word
function findFirstEmptyInWord(r, c, dir) {
    const solution = dailyPuzzle.solution;
    let currR = r;
    let currC = c;

    // 1. Rewind to start of word
    if (dir === 'across') {
        while (currC > 0 && solution[currR][currC - 1] !== '#') {
            currC--;
        }
    } else {
        while (currR > 0 && solution[currR - 1][currC] !== '#') {
            currR--;
        }
    }

    // 2. Scan forward for empty
    if (dir === 'across') {
        while (currC < 5 && solution[currR][currC] !== '#') {
            if (currentGrid[currR][currC] === '') {
                return [currR, currC];
            }
            currC++;
        }
    } else {
        while (currR < 5 && solution[currR][currC] !== '#') {
            if (currentGrid[currR][currC] === '') {
                return [currR, currC];
            }
            currR++;
        }
    }

    // 3. If no empty found, return original
    return [r, c];
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
            const [nr, nc] = findFirstEmptyInWord(clue.row, clue.col, direction);
            activeRow = nr;
            activeCol = nc;
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
            const [nr, nc] = findFirstEmptyInWord(clue.row, clue.col, direction);
            activeRow = nr;
            activeCol = nc;
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
            checkWin(); 
            break;
        case ' ':
            direction = direction === 'across' ? 'down' : 'across';
            const [nr, nc] = findFirstEmptyInWord(activeRow, activeCol, direction);
            activeRow = nr;
            activeCol = nc;
            updateHighlights();
            break;
    }
});

// Helper: Mobile Scroll Logic
function scrollToMobileClue() {
    if (window.innerWidth <= 768 && currentClueBar) {
        currentClueBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function handleCellClick(r, c) {
    let shouldCheckEmpty = false;
    
    if (activeRow === r && activeCol === c) {
        direction = direction === 'across' ? 'down' : 'across';
        shouldCheckEmpty = true;
    } else {
        activeRow = r;
        activeCol = c;
        if (currentGrid[r][c] !== '') {
            shouldCheckEmpty = true;
        }
    }

    if (shouldCheckEmpty) {
        const [nr, nc] = findFirstEmptyInWord(activeRow, activeCol, direction);
        activeRow = nr;
        activeCol = nc;
    }

    updateHighlights();
    focusInput();

    // Scroll to clue after delay (allowing keyboard animation to start)
    if (window.innerWidth <= 768) {
        setTimeout(scrollToMobileClue, 300);
    }
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
    let found = false;
    
    let moves = 0;
    while (moves < 26) {
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

        moves++;

        if (dailyPuzzle.solution[r][c] !== '#') {
            if (step > 0) {
                if (currentGrid[r][c] === '') {
                    activeRow = r;
                    activeCol = c;
                    found = true;
                    break;
                }
            } 
            else {
                activeRow = r;
                activeCol = c;
                found = true;
                break;
            }
        }
    }

    if (step > 0 && !found) {
        simpleMove(1);
    } else {
        updateHighlights();
    }
}

function simpleMove(step) {
    let r = activeRow;
    let c = activeCol;
    let loops = 0;
    while (loops < 10) {
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

    // Ensure mobile clue is visible when clue changes
    scrollToMobileClue();
}

function checkWin() {
    let isComplete = true;
    let isCorrect = true;
    let errorCount = 0;

    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (dailyPuzzle.solution[r][c] === '#') continue;
            const val = currentGrid[r][c];
            const sol = dailyPuzzle.solution[r][c];
            
            if (val === '') {
                isComplete = false;
            } else if (val !== sol) {
                isCorrect = false;
                errorCount++;
            }
        }
    }

    if (isComplete) {
        if (isCorrect) {
            feedbackMessageEl.classList.remove('visible');
            if (!isGameFinished) gameWon();
        } else {
            feedbackMessageEl.textContent = `${errorCount} incorrect letter${errorCount === 1 ? '' : 's'}`;
            feedbackMessageEl.classList.add('visible');
        }
    } else {
        feedbackMessageEl.classList.remove('visible');
    }
}

function gameWon() {
    isGameFinished = true;
    stopTimer();
    giveUpBtn.style.display = 'none';
    finalTimeEl.textContent = timerEl.textContent;
    
    // Process Medal & Save
    processWin();

    setTimeout(() => {
        modal.classList.remove('hidden');
    }, 300);
}

document.addEventListener('click', (e) => {
    if (!startScreen.classList.contains('hidden')) return;
    if (!modal.contains(e.target) && !e.target.classList.contains('primary-btn') && !e.target.classList.contains('nickname-input') && !e.target.classList.contains('secondary-btn')) {
        if(isGameActive && !isGameFinished) inputProxy.focus();
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    fetchLeaderboard();
    gameUI.classList.remove('visible');
    startScreen.classList.remove('hidden');
    setTimeout(() => {
        timerEl.textContent = "00:00";
    }, 500);
});

giveUpBtn.addEventListener('click', giveUp);

initApp();