document.addEventListener('DOMContentLoaded', () => {
    // Game State
    let currentGrid = Array(5).fill().map(() => Array(5).fill(''));
    let activeRow = 0;
    let activeCol = 0;
    let direction = 'across'; // 'across' or 'down'
    let timerInterval = null;
    let startTime = null;
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

    // Mobile Keyboard Proxy
    const inputProxy = document.createElement('input');
    inputProxy.type = 'text';
    inputProxy.style.position = 'absolute';
    inputProxy.style.opacity = '0';
    inputProxy.style.height = '0';
    inputProxy.style.width = '0';
    inputProxy.style.fontSize = '16px'; 
    document.body.appendChild(inputProxy);

    // --- Initialization & Start Logic ---

    function initApp() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = new Date().toLocaleDateString('en-US', options);
        
        // Set date on both screens
        startDateDisplay.textContent = dateStr;
        currentDateEl.textContent = dateStr;
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

        // Determine starting cell (first non-black square)
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

    // --- Game Rendering ---

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

    // --- Timer Logic ---

    function startTimer() {
        if (isGameActive) return;
        isGameActive = true;
        startTime = Date.now();
        timerInterval = setInterval(() => {
            const delta = Math.floor((Date.now() - startTime) / 1000);
            const mins = Math.floor(delta / 60).toString().padStart(2, '0');
            const secs = (delta % 60).toString().padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        isGameActive = false; // Stop internal tracker
    }

    // --- Input Handling ---

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

    // --- Navigation & Logic ---

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
            // Jump over black square once
            if (dailyPuzzle.solution[r][c] === '#') {
                r += rowDelta;
                c += colDelta;
            }
            // Check validity
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
            
            // Wrap
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
        setTimeout(() => {
            modal.classList.remove('hidden');
        }, 300);
    }

    // --- Event Listeners ---

    document.addEventListener('click', (e) => {
        // Only focus if game is visible, active, and modal is closed
        if (!startScreen.classList.contains('hidden')) return;
        if (!modal.contains(e.target) && !e.target.classList.contains('primary-btn')) {
            if(isGameActive && !isGameFinished) inputProxy.focus();
        }
    });

    startBtn.addEventListener('click', startGame);
    
    restartBtn.addEventListener('click', startGame);

    // Run on Load
    initApp();
});