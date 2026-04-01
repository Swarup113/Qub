// ===== Game State =====
const TURN_DURATION = 15;

// Strict list of valid 2-letter words (Standard English, no abbreviations)
const VALID_TWO_LETTER_WORDS = new Set([
    // Core standard words
    'am', 'an', 'as', 'at',
    'be', 'by',
    'do',
    'go',
    'he',
    'if', 'in', 'is', 'it',
    'me', 'my',
    'no',
    'of', 'on', 'or', 'ox', 'uk',
    'so',
    'to',
    'up', 'us',
    'we',

    // Interjections / conversational
    'ah', 'eh', 'hm', 'mm',
    'oh', 'uh', 'um',

    // Common extras
    'hi', 'ok',

    // Less common but valid dictionary words
    'ad', 'id', 
]);

// Blocklist for words that the API might wrongly accept (abbreviations, slang, offensive terms)
const BLOCKED_WORDS = new Set([
    'tox','paki', 'azz', 'sux', 'fuk', 'dic','doo', 'oso','iso', 'ison', 'soo', 'cok' , 'abi', 'nox', 'poc'
]);

let gameState = {
    board: [],
    currentPlayer: 1,
    players: [
        { name: 'Player 1', score: 0 },
        { name: 'Player 2', score: 0 }
    ],
    selectedCell: null,
    cellsRemaining: 100,
    gameOver: false,
    isProcessing: false,
    usedWords: new Set(),
    totalWordsFound: 0,
    timer: null,
    timeLeft: TURN_DURATION
};

// Simple in-memory cache for API results
const apiCache = {};

// ===== DOM Elements =====
const landingPage = document.getElementById('landing-page');
const gamePage = document.getElementById('game-page');
const playerForm = document.getElementById('player-form');
const rulesModal = document.getElementById('rules-modal');
const scoreModal = document.getElementById('score-modal');
const usedWordModal = document.getElementById('used-word-modal');
const timeoutModal = document.getElementById('timeout-modal');
const confirmFinishModal = document.getElementById('confirm-finish-modal');
const finishModal = document.getElementById('finish-modal');
const gameoverModal = document.getElementById('gameover-modal');
const keyboard = document.getElementById('keyboard');
const overlay = document.getElementById('overlay');
const gameBoard = document.getElementById('game-board');
const apiStatus = document.getElementById('api-status');
const timerDisplay = document.getElementById('timer-display');
const timerCirclePath = document.getElementById('timer-circle-path');
const timerCircle = document.getElementById('timer-circle');

// ===== Initialize =====
function init() {
    createBoard();
    createKeyboard();
    setupEventListeners();
    updateTimerColor(); // initial based on currentPlayer (1)
    updateKeyboardHoverClass();
}

// ===== Create Board =====
function createBoard() {
    gameBoard.innerHTML = '';
    gameState.board = [];
    
    for (let i = 0; i < 10; i++) {
        gameState.board[i] = [];
        for (let j = 0; j < 10; j++) {
            gameState.board[i][j] = { letter: null, player: null };
            
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.tabIndex = 0;
            
            gameBoard.appendChild(cell);
        }
    }
}

// ===== Create QWERTY Keyboard =====
function createKeyboard() {
    const keyboardRows = document.getElementById('keyboard-rows');
    keyboardRows.innerHTML = '';
    
    const rows = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];
    
    rows.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'keyboard-row';
        
        row.forEach(letter => {
            const key = document.createElement('button');
            key.className = 'key';
            key.textContent = letter;
            key.dataset.letter = letter;
            rowDiv.appendChild(key);
        });
        
        keyboardRows.appendChild(rowDiv);
    });
}

// ===== Setup Event Listeners =====
function setupEventListeners() {
    playerForm.addEventListener('submit', handleStartGame);
    
    document.getElementById('rules-btn').addEventListener('click', () => showModal(rulesModal));
    document.getElementById('close-rules').addEventListener('click', () => hideModal(rulesModal));
    
    document.getElementById('keyboard-close').addEventListener('click', hideKeyboard);
    
    keyboard.addEventListener('click', (e) => {
        if (e.target.classList.contains('key') && !gameState.isProcessing) {
            handleLetterSelect(e.target.dataset.letter);
        }
    });
    
    gameBoard.addEventListener('click', handleCellClick);
    
    overlay.addEventListener('click', () => {
        if (!gameState.isProcessing) {
            hideKeyboard();
            hideModal(rulesModal);
            hideModal(finishModal);
        }
    });
    
    // Header buttons
    document.getElementById('finish-btn').addEventListener('click', showFinishConfirm);
    
    // Old confirm modal (kept for compatibility, but not used)
    document.getElementById('confirm-yes-btn').addEventListener('click', () => {
        hideModal(confirmFinishModal);
        endGame(true);
    });
    document.getElementById('confirm-no-btn').addEventListener('click', () => {
        hideModal(confirmFinishModal);
    });
    
    // New finish modal buttons
    document.getElementById('resume-btn').addEventListener('click', () => {
        hideModal(finishModal);
    });
    document.getElementById('newgame-btn').addEventListener('click', () => {
        hideModal(finishModal);
        goHome();
    });
    document.getElementById('quit-btn').addEventListener('click', () => {
        // Attempt to close the tab/window
        window.close();
        // If that fails (browser security), fallback to home
        setTimeout(() => {
            goHome();
        }, 100);
    });
    
    // Game Over buttons
    document.getElementById('play-again-btn').addEventListener('click', resetGame);
    document.getElementById('home-btn').addEventListener('click', goHome);
}

// ===== Timer Color (based on current player) =====
function updateTimerColor() {
    timerCircle.classList.remove('player1-turn', 'player2-turn');
    if (gameState.currentPlayer === 1) {
        timerCircle.classList.add('player1-turn');
    } else {
        timerCircle.classList.add('player2-turn');
    }
}

// ===== Keyboard Hover Class (body) =====
function updateKeyboardHoverClass() {
    document.body.classList.remove('player1-turn', 'player2-turn');
    if (gameState.currentPlayer === 1) {
        document.body.classList.add('player1-turn');
    } else {
        document.body.classList.add('player2-turn');
    }
}

// ===== Timer Logic =====
function startTimer() {
    clearInterval(gameState.timer);
    gameState.timeLeft = TURN_DURATION;
    updateTimerUI();
    
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        updateTimerUI();
        
        if (gameState.timeLeft <= 0) {
            handleTimeout();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(gameState.timer);
}

function updateTimerUI() {
    const time = gameState.timeLeft;
    timerDisplay.textContent = time;
    
    const percent = (time / TURN_DURATION) * 100;
    timerCirclePath.style.strokeDasharray = `${percent} 100`;
    
    if (time <= 5) {
        timerCirclePath.style.stroke = 'var(--danger)';
        timerDisplay.style.color = 'var(--danger)';
    } else if (time <= 10) {
        timerCirclePath.style.stroke = '#ffc107';
        timerDisplay.style.color = '#ffc107';
    } else {
        // stroke color is determined by current player via class, so we set it to current player color
        const strokeColor = gameState.currentPlayer === 1 ? 'var(--player1-color)' : 'var(--player2-color)';
        timerCirclePath.style.stroke = strokeColor;
        timerDisplay.style.color = 'var(--text-primary)';
    }
}

function handleTimeout() {
    stopTimer();
    gameState.isProcessing = true;
    hideKeyboard();
    
    gameState.players[gameState.currentPlayer - 1].score -= 1;
    updateScoreboard();
    
    showModal(timeoutModal);
    
    setTimeout(() => {
        hideModal(timeoutModal);
        switchPlayer();
        gameState.isProcessing = false;
        startTimer();
    }, 1500);
}

// ===== Handle Start Game =====
function handleStartGame(e) {
    e.preventDefault();
    
    const player1Name = document.getElementById('player1-name').value.trim() || 'Player 1';
    const player2Name = document.getElementById('player2-name').value.trim() || 'Player 2';
    
    gameState.players[0].name = player1Name;
    gameState.players[1].name = player2Name;
    
    document.getElementById('p1-score-name').textContent = player1Name;
    document.getElementById('p2-score-name').textContent = player2Name;
    document.getElementById('current-player-name').textContent = player1Name;
    document.getElementById('current-player-name').className = 'current-player player1';
    
    landingPage.classList.remove('active');
    gamePage.classList.add('active');
    
    resetGame();
}

// ===== Handle Cell Click =====
function handleCellClick(e) {
    if (gameState.isProcessing) return;
    
    const cell = e.target.closest('.cell');
    if (!cell || cell.classList.contains('filled') || gameState.gameOver) return;
    
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    
    if (gameState.selectedCell) {
        const prevCell = document.querySelector(`.cell[data-row="${gameState.selectedCell.row}"][data-col="${gameState.selectedCell.col}"]`);
        if (prevCell) prevCell.classList.remove('selected');
    }
    
    gameState.selectedCell = { row, col };
    cell.classList.add('selected');
    
    showKeyboard();
}

// ===== Handle Letter Select =====
async function handleLetterSelect(letter) {
    if (!gameState.selectedCell || gameState.gameOver) return;
    
    stopTimer();
    gameState.isProcessing = true;
    
    const { row, col } = gameState.selectedCell;
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    
    if (!cell || cell.classList.contains('filled')) {
        gameState.isProcessing = false;
        startTimer();
        return;
    }
    
    // Place letter
    gameState.board[row][col] = { letter, player: gameState.currentPlayer };
    
    cell.textContent = letter.toUpperCase();
    cell.classList.remove('selected');
    cell.classList.add('filled', `player${gameState.currentPlayer}`, 'new');
    
    gameState.cellsRemaining--;
    document.getElementById('cells-remaining').textContent = gameState.cellsRemaining;
    
    hideKeyboard();
    
    try {
        apiStatus.classList.add('checking');
        const result = await checkWords(row, col);
        apiStatus.classList.remove('checking');
        
        if (result.points > 0) {
            gameState.players[gameState.currentPlayer - 1].score += result.points;
            updateScoreboard();
            
            document.getElementById('word-formed').textContent = result.words.join(' + ');
            document.getElementById('points-earned').textContent = `+${result.points} points!`;
            
            // Add player-specific class to modal content
            const modalContent = document.querySelector('#score-modal .score-modal-content');
            modalContent.classList.remove('player1-points', 'player2-points');
            modalContent.classList.add(gameState.currentPlayer === 1 ? 'player1-points' : 'player2-points');
            
            showModal(scoreModal);
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            hideModal(scoreModal);
            
            if (!checkGameEnd()) {
                gameState.isProcessing = false;
                startTimer(); // Player keeps turn
            }
        } else {
            if (result.usedWordFound) {
                showModal(usedWordModal);
                await new Promise(resolve => setTimeout(resolve, 1500));
                hideModal(usedWordModal);
            }
            
            switchPlayer();
            if (!checkGameEnd()) {
                gameState.isProcessing = false;
                startTimer();
            }
        }
    } catch (error) {
        console.error("Error:", error);
        apiStatus.classList.remove('checking');
        switchPlayer();
        if (!checkGameEnd()) {
            gameState.isProcessing = false;
            startTimer();
        }
    }
}

// ===== Filter unnatural words like OTO, NON =====
function isNaturalWord(word) {
    const w = word.toLowerCase();

    // Block ABA pattern (e.g., OTO, NON, ABA)
    if (w.length === 3 && w[0] === w[2]) {
        return false;
    }

    return true;
}

// ===== Check Words (FINAL BALANCED LOGIC) =====
async function checkWords(row, col) {
    let totalPoints = 0;
    const formedWords = [];
    let usedWordFound = false;

    const hData = getWordData(row, col, 'h');
    const vData = getWordData(row, col, 'v');

    const processLine = async (data) => {
        if (data.word.length < 2) return false;

        const candidates = [];

        // Step 1: collect ALL candidates (long → short)
        for (let len = data.word.length; len >= 2; len--) {
            const maxStart = data.word.length - len;

            for (let start = 0; start <= maxStart; start++) {
                const end = start + len;

                if (start <= data.index && end > data.index) {
                    const sub = data.word.substring(start, end);
                    candidates.push(sub);
                }
            }
        }

        let bestWord = null;

        // Step 2: find BEST valid word
        for (const cand of candidates) {
            const isValid = await validateWord(cand);

            if (isValid && isNaturalWord(cand)) {
                const w = cand.toLowerCase();

                if (!gameState.usedWords.has(w)) {
                    // Prefer longest word
                    if (!bestWord || cand.length > bestWord.length) {
                        bestWord = cand;
                    }
                } else {
                    usedWordFound = true;
                }
            }
        }

        // Step 3: apply best word
        if (bestWord) {
            totalPoints += bestWord.length;
            formedWords.push(bestWord.toUpperCase());
            gameState.usedWords.add(bestWord.toLowerCase());
            gameState.totalWordsFound++;
            return true;
        }

        return false;
    };

    // Only ONE direction per move (Standard rule for this game variant)
    let found = await processLine(hData);

    if (!found) {
        await processLine(vData);
    }

    return { points: totalPoints, words: formedWords, usedWordFound };
}

// Helper to get word string and relative index
function getWordData(row, col, direction) {
    let word = '';
    let index = 0;
    
    if (direction === 'h') {
        let startCol = col;
        while (startCol > 0 && gameState.board[row][startCol - 1].letter) startCol--;
        let endCol = col;
        while (endCol < 9 && gameState.board[row][endCol + 1].letter) endCol++;
        
        for (let c = startCol; c <= endCol; c++) {
            word += gameState.board[row][c].letter;
            if (c === col) index = word.length - 1;
        }
    } else {
        let startRow = row;
        while (startRow > 0 && gameState.board[startRow - 1][col].letter) startRow--;
        let endRow = row;
        while (endRow < 9 && gameState.board[endRow + 1][col].letter) endRow++;
        
        for (let r = startRow; r <= endRow; r++) {
            word += gameState.board[r][col].letter;
            if (r === row) index = word.length - 1;
        }
    }
    
    return { word, index };
}

// ===== Validate Word (Local + API) =====
async function validateWord(word) {
    const w = word.toLowerCase();
    
    // 0. Check Blocklist (prevent API false positives like 'tox')
    if (BLOCKED_WORDS.has(w)) {
        return false;
    }

    // 1. Check strict 2-letter list first
    if (w.length === 2) {
        return VALID_TWO_LETTER_WORDS.has(w);
    }

    // 2. Check cache
    if (apiCache.hasOwnProperty(w)) {
        return apiCache[w];
    }
    
    // 3. Check API for longer words
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${w}`;
    
    try {
        const response = await fetch(url);
        const isValid = response.ok;
        apiCache[w] = isValid;
        return isValid;
    } catch (error) {
        console.error('Network error:', error);
        apiCache[w] = false;
        return false;
    }
}

// ===== Switch Player =====
function switchPlayer() {
    gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
    
    const playerNameEl = document.getElementById('current-player-name');
    playerNameEl.textContent = gameState.players[gameState.currentPlayer - 1].name;
    playerNameEl.className = `current-player player${gameState.currentPlayer}`;
    
    document.querySelector('.player1-score').classList.toggle('active', gameState.currentPlayer === 1);
    document.querySelector('.player2-score').classList.toggle('active', gameState.currentPlayer === 2);
    
    updateTimerColor();
    updateKeyboardHoverClass();
}

// ===== Update Scoreboard =====
function updateScoreboard() {
    document.getElementById('p1-score').textContent = gameState.players[0].score;
    document.getElementById('p2-score').textContent = gameState.players[1].score;
}

// ===== Show Finish Confirm (New Modal) =====
function showFinishConfirm() {
    if (gameState.gameOver) return;
    
    // Populate finish modal
    const p1Name = gameState.players[0].name;
    const p2Name = gameState.players[1].name;
    const p1Score = gameState.players[0].score;
    const p2Score = gameState.players[1].score;
    const totalWords = gameState.totalWordsFound;
    
    document.getElementById('finish-p1-name').textContent = p1Name;
    document.getElementById('finish-p2-name').textContent = p2Name;
    document.getElementById('finish-p1-score').textContent = p1Score;
    document.getElementById('finish-p2-score').textContent = p2Score;
    document.getElementById('finish-words-total').textContent = totalWords;
    
    const winnerDiv = document.getElementById('finish-winner-text');
    if (p1Score > p2Score) {
        winnerDiv.innerHTML = `${p1Name} wins! 🏆`;
        winnerDiv.className = 'winner-announcement winner-p1';
    } else if (p2Score > p1Score) {
        winnerDiv.innerHTML = `${p2Name} wins! 🏆`;
        winnerDiv.className = 'winner-announcement winner-p2';
    } else {
        winnerDiv.innerHTML = `It's a tie! 🤝`;
        winnerDiv.className = 'winner-announcement winner-tie';
    }
    
    showModal(finishModal);
}

// ===== Check Game End =====
function checkGameEnd() {
    if (gameState.cellsRemaining === 0) {
        endGame(false);
        return true;
    }
    return false;
}

// ===== End Game =====
function endGame(manualFinish) {
    gameState.gameOver = true;
    stopTimer();
    gameState.isProcessing = true;
    
    const p1Score = gameState.players[0].score;
    const p2Score = gameState.players[1].score;
    
    let title = manualFinish ? "Game Finished!" : "Game Over";
    let winnerText;
    
    if (p1Score > p2Score) {
        winnerText = `${gameState.players[0].name} Wins!`;
    } else if (p2Score > p1Score) {
        winnerText = `${gameState.players[1].name} Wins!`;
    } else {
        winnerText = "It's a Tie!";
    }
    
    document.getElementById('gameover-title').textContent = title;
    document.getElementById('winner-text').textContent = winnerText;
    document.getElementById('final-score').textContent = `${p1Score} - ${p2Score}`;
    document.getElementById('final-words').textContent = gameState.totalWordsFound;
    
    showModal(gameoverModal);
}

// ===== Reset Game =====
function resetGame() {
    hideModal(gameoverModal);
    hideModal(finishModal);
    
    gameState = {
        board: [],
        currentPlayer: 1,
        players: gameState.players,
        selectedCell: null,
        cellsRemaining: 100,
        gameOver: false,
        isProcessing: false,
        usedWords: new Set(),
        totalWordsFound: 0,
        timer: null,
        timeLeft: TURN_DURATION
    };
    
    gameState.players[0].score = 0;
    gameState.players[1].score = 0;
    
    createBoard();
    updateScoreboard();
    
    document.getElementById('cells-remaining').textContent = '100';
    document.getElementById('current-player-name').textContent = gameState.players[0].name;
    document.getElementById('current-player-name').className = 'current-player player1';
    
    document.querySelector('.player1-score').classList.add('active');
    document.querySelector('.player2-score').classList.remove('active');
    
    gameState.isProcessing = false;
    updateTimerColor();
    updateKeyboardHoverClass();
    startTimer();
}

// ===== Go Home =====
function goHome() {
    stopTimer();
    hideModal(gameoverModal);
    hideModal(finishModal);
    gamePage.classList.remove('active');
    landingPage.classList.add('active');
    document.getElementById('player1-name').value = '';
    document.getElementById('player2-name').value = '';
}

// ===== UI Helpers =====
function showKeyboard() {
    keyboard.classList.add('active');
    overlay.classList.add('active');
}

function hideKeyboard() {
    keyboard.classList.remove('active');
    overlay.classList.remove('active');
    
    if (gameState.selectedCell) {
        const cell = document.querySelector(`.cell[data-row="${gameState.selectedCell.row}"][data-col="${gameState.selectedCell.col}"]`);
        if (cell && !cell.classList.contains('filled')) {
            cell.classList.remove('selected');
        }
    }
}

function showModal(modal) {
    modal.classList.add('active');
    overlay.classList.add('active');
}

function hideModal(modal) {
    modal.classList.remove('active');
    // If we hide the score modal, remove the player-specific classes
    if (modal === scoreModal) {
        const modalContent = document.querySelector('#score-modal .score-modal-content');
        modalContent.classList.remove('player1-points', 'player2-points');
    }
    if (!keyboard.classList.contains('active') && !gameState.isProcessing) {
        overlay.classList.remove('active');
    }
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', init);