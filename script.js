// Stream info to the infoStream area
function streamInfo(message) {
  const infoDiv = document.getElementById('infoStream');
  if (infoDiv) infoDiv.textContent = message;
}

function getGameInstruction() {
  if (gameState.gameOver) return 'Game over!';
  if (gameState.vsComputer) {
    if (gameState.currentRoll === null) {
      if (gameState.roller === 0) return 'Player: Roll the dice to start your turn.';
      else return 'Computer is rolling the dice...';
    }
    if (gameState.roller === 0) {
      if (gameState.currentPlayer === 0 && !gameState.hasPlaced) return `Player: Place ${gameState.currentRoll} on your grid.`;
      if (gameState.currentPlayer === 0 && gameState.hasPlaced) return 'Click End Turn to let the computer place.';
      if (gameState.currentPlayer === 1 && !gameState.hasPlaced) return 'Computer is placing the number...';
    } else {
      if (gameState.currentPlayer === 0 && !gameState.hasPlaced) return `Player: Place ${gameState.currentRoll} on your grid.`;
      if (gameState.currentPlayer === 0 && gameState.hasPlaced) return 'Click End Turn to let the computer place.';
      if (gameState.currentPlayer === 1 && !gameState.hasPlaced) return 'Computer is placing the number...';
    }
    return '';
  } else {
    // PvP
    if (gameState.currentRoll === null) return `Player ${gameState.currentPlayer + 1}: Roll the dice to start your turn.`;
    if (!gameState.hasPlaced) return `Player ${gameState.currentPlayer + 1}: Place ${gameState.currentRoll} on your grid.`;
      // If both players have placed this roll, prompt the next player to roll (otherwise prompt to end turn)
      if (gameState.placementsThisRoll >= 2) {
        const nextPlayer = gameState.lastRoller === null ? 0 : 1 - gameState.lastRoller;
        return `Player ${nextPlayer + 1}: Roll the dice to start your turn.`;
      }
      if (gameState.hasPlaced) return `Click End Turn to let Player ${gameState.currentPlayer === 0 ? 2 : 1} play.`;
    return '';
  }
}


const SIZE = 5;
const TOTAL_CELLS = SIZE * SIZE;

let gameState = {
  playerBoards: [Array(TOTAL_CELLS).fill(null), Array(TOTAL_CELLS).fill(null)],
  currentPlayer: 0, // 0 = Player 1, 1 = Player 2
  currentRoll: null,
  gameOver: false,
  hasRolled: false,
  hasPlaced: false,
  placementsThisRoll: 0, // Track how many players have placed this roll
  waitingForOverlay: false,
  vsComputer: false,
  lastPlacement: null, // {player, index, value} for undo
  roller: 0, // 0 = Player rolls, 1 = Computer rolls (PvC mode)
  lastRoller: null // track who rolled the current roll (PvP only)
};


const gameContainer = document.querySelector('.game-container');
const boardsContainer = document.querySelector('.boards-container');
const board1 = document.querySelector('.player1');
const board2 = document.querySelector('.player2');
const grid1Element = document.querySelector('.player1 .grid');
const grid2Element = document.querySelector('.player2 .grid');
const mask1 = document.querySelector('.player1 .mask');
const mask2 = document.querySelector('.player2 .mask');
const controls = document.querySelector('.controls');
const rollBtn = document.getElementById('rollBtn');
const undoBtn = document.getElementById('undoBtn');
const nextBtn = document.getElementById('nextBtn');
const quitBtn = document.getElementById('quitBtn');
const helpBtn = document.getElementById('helpBtn');
const infoBtn = document.getElementById('infoBtn');
const rulesModal = document.getElementById('rulesModal');
const closeRulesBtn = document.getElementById('closeRulesBtn');
// Start overlay elements
const modeOverlay = document.getElementById('modeSelect');
const modePvP = document.getElementById('modePvP');
const modePVC = document.getElementById('modePVC');

// ========================================
// INITIALIZATION
// ========================================
function createGrid() {
  grid1Element.innerHTML = '';
  grid2Element.innerHTML = '';

  for (let i = 0; i < TOTAL_CELLS; i++) {
    // Player 1 cell
    const cell1 = document.createElement('div');
    cell1.className = 'cell';
    cell1.addEventListener('click', () => handleCellClick(0, i));
    grid1Element.appendChild(cell1);

    // Player 2 cell
    const cell2 = document.createElement('div');
    cell2.className = 'cell';
    cell2.addEventListener('click', () => handleCellClick(1, i));
    grid2Element.appendChild(cell2);
  }
}

// ========================================
// MASKING - Hide inactive player board
// ========================================
function updateMasking() {
  const isMobile = window.innerWidth <= 480;

  // In vs Computer mode
  if (gameState.vsComputer) {
    // On mobile: show only the player whose turn it is
    if (isMobile) {
      if (gameState.currentPlayer === 0) {
        // Player's turn - show Player 1
        board1.classList.add('show');
        board2.classList.remove('show');
      } else {
        // Computer's turn - show Computer (Player 2)
        board1.classList.remove('show');
        board2.classList.add('show');
      }
    } else {
      // On desktop: show both boards
      board1.classList.add('show');
      board2.classList.add('show');
    }
    return;
  }

  // In vs Player mode, hide opponent's board
  const isPlayer1Active = gameState.currentPlayer === 0;

  if (isPlayer1Active) {
    board1.classList.add('show');
    board2.classList.remove('show');
  } else {
    board1.classList.remove('show');
    board2.classList.add('show');
  }
}

// ========================================
// RENDER BOARD
// ========================================
function renderBoard(playerIndex) {
  const gridElement = playerIndex === 0 ? grid1Element : grid2Element;
  const cells = gridElement.querySelectorAll('.cell');
  const board = gameState.playerBoards[playerIndex];

  cells.forEach((cell, i) => {
    const value = board[i];

    if (value !== null) {
      cell.textContent = value;
      cell.classList.add('filled');
      cell.classList.add('disabled'); // Filled cells are disabled
    } else {
      cell.textContent = '';
      cell.classList.remove('filled');
      cell.classList.remove('disabled'); // Empty cells are clickable by default
    }
  });

  // Enable/disable empty cells based on game state
  if (gameState.currentRoll !== null && !gameState.hasPlaced && !gameState.gameOver && playerIndex === gameState.currentPlayer) {
    enableEmptyCells(playerIndex);
  } else {
    disableEmptyCells(playerIndex);
  }

  // Highlight scoring groups
  highlightScoringGroups(board, cells);
}

function enableEmptyCells(playerIndex) {
  const gridElement = playerIndex === 0 ? grid1Element : grid2Element;
  const cells = gridElement.querySelectorAll('.cell');
  const board = gameState.playerBoards[playerIndex];

  cells.forEach((cell, i) => {
    if (board[i] === null) {
      cell.classList.remove('disabled');
    }
  });
}

function disableEmptyCells(playerIndex) {
  const gridElement = playerIndex === 0 ? grid1Element : grid2Element;
  const cells = gridElement.querySelectorAll('.cell');
  const board = gameState.playerBoards[playerIndex];

  cells.forEach((cell, i) => {
    if (board[i] === null) {
      cell.classList.add('disabled');
    }
  });
}

// ========================================
// DICE ROLL
// ========================================
function rollDice() {
  const dice1 = Math.floor(Math.random() * 6) + 1;
  const dice2 = Math.floor(Math.random() * 6) + 1;
  return dice1 + dice2;
}

// Animate the existing small badge (helpBtn) to rapidly cycle numbers then show final
function animateBadge(finalValue, duration = 700, cb) {
  if (!helpBtn) {
    if (typeof cb === 'function') cb();
    return;
  }
  const start = Date.now();
  const intervalMs = 60;
  const iv = setInterval(() => {
    const now = Date.now();
    if (now - start >= duration) return;
    const r = Math.floor(Math.random() * 11) + 2; // 2..12
    helpBtn.textContent = String(r);
  }, intervalMs);
  setTimeout(() => {
    clearInterval(iv);
    helpBtn.textContent = String(finalValue);
    if (typeof cb === 'function') cb();
  }, duration);
}

function handleRollClick() {
  if (gameState.gameOver) return;
  if (gameState.hasRolled) return; // Already rolled, wait for placement
  if (gameState.vsComputer && gameState.roller !== 0) return; // Only player can roll when roller is 0

  // Roll the dice
  if (gameState.vsComputer && gameState.roller === 1) {
    streamInfo('Computer is rolling the dice...');
    const final = rollDice();
    setTimeout(() => {
      // animate in the existing badge area then apply
      animateBadge(final, 900, () => {
        gameState.lastRoller = gameState.currentPlayer;
        gameState.currentRoll = final;
        gameState.hasRolled = true;
        gameState.hasPlaced = false;
        gameState.lastPlacement = null;
        updateRollBadge();
        updateUI();
        renderBoard(gameState.currentPlayer);
        enableEmptyCells(gameState.currentPlayer);
      });
    }, 300);
    return;
  }
  const final = rollDice();
  // animate the badge so numbers flash then final appears
  animateBadge(final, 700, () => {
    gameState.lastRoller = gameState.currentPlayer;
    gameState.currentRoll = final;
    gameState.hasRolled = true;
    gameState.hasPlaced = false;
    gameState.lastPlacement = null;
    updateRollBadge();
    updateUI();
    renderBoard(gameState.currentPlayer);
    enableEmptyCells(gameState.currentPlayer);
  });
}

function updateRollBadge() {
  if (helpBtn) {
    helpBtn.textContent = gameState.currentRoll === null ? '?' : String(gameState.currentRoll);
  }
}

// ========================================
// CELL CLICK HANDLER
// ========================================
function handleCellClick(playerIndex, index) {
  // Validation
  if (gameState.gameOver) return;

  // Only current player can click
  if (playerIndex !== gameState.currentPlayer) return;

  // Must have rolled
  if (gameState.currentRoll === null) return;

  // Must be empty
  if (gameState.playerBoards[playerIndex][index] !== null) return;

  // Already placed
  if (gameState.hasPlaced) return;

  // Place the number on current player's board only
  gameState.playerBoards[playerIndex][index] = gameState.currentRoll;
  gameState.hasPlaced = true;
  gameState.placementsThisRoll += 1;

  // Store for undo
  gameState.lastPlacement = {
    player: playerIndex,
    index: index,
    value: gameState.currentRoll
  };

  // Update UI
  renderBoard(playerIndex);
  updateUI();

  // Check if game is over
  if (checkGameOver()) {
    handleGameOver();
  }
  // Auto-advance round when both players have placed (PvP or PvC)
  if (gameState.placementsThisRoll >= 2) {
    setTimeout(() => {
      endRound();
    }, 350);
  }
}

// ========================================
// UNDO FUNCTIONALITY
// ========================================
function handleUndo() {
  if (!gameState.lastPlacement) return;

  const { player, index, value } = gameState.lastPlacement;

  // Only undo current player's last move
  if (player !== gameState.currentPlayer) return;

  // Remove placement
  gameState.playerBoards[player][index] = null;
  gameState.hasPlaced = false;
  gameState.placementsThisRoll -= 1;
  gameState.lastPlacement = null;

  // Update UI
  renderBoard(player);
  updateUI();

  // Re-enable empty cells
  enableEmptyCells(player);
}

// ========================================
// END TURN - Switch to other player to place same roll
// ========================================
function endTurn() {
  if (!gameState.hasPlaced) {
    alert('Place the number before ending your turn!');
    return;
  }

  gameState.hasPlaced = false;
  gameState.lastPlacement = null;

  if (gameState.vsComputer) {
    // PvC mode: determine who rolls and who places
    if (gameState.currentPlayer === 0) {
      // Player just placed
      if (gameState.roller === 0) {
        // Player was the roller this round, computer should now place the same number
        gameState.currentPlayer = 1;
        updateMasking();
        updateUI();
        renderBoard(1);
        setTimeout(() => {
          computerPlaceIfNeeded();
        }, 400);
      }
      // If roller was computer, this case shouldn't happen (computer places first)
    } else {
      // Computer just placed
      if (gameState.roller === 1) {
        // Computer was the roller this round, player should now place the same number
        gameState.currentPlayer = 0;
        gameState.hasPlaced = false;
        updateMasking();
        updateUI();
        renderBoard(0);
        enableEmptyCells(0);
      } else {
        // Player was the roller, both have now placed — advance round
        if (checkGameOver()) {
          handleGameOver();
          return;
        }
        setTimeout(() => {
          endRound();
        }, 350);
      }
    }
    return;
  }

  // PvP mode (original logic)
  // Check if both players have now placed
  if (gameState.placementsThisRoll >= 2) {
    // Both placed this roll - reset for next round
    endRound();
    return;
  }

  // Switch to other player
  gameState.currentPlayer = gameState.currentPlayer === 0 ? 1 : 0;

  // Update UI
  updateMasking();
  updateUI();
  renderBoard(gameState.currentPlayer);

  // Show turn overlay only in PvP mode
  if (!gameState.vsComputer) {
    showTurnOverlay(gameState.currentPlayer);
  }
  // If computer's turn, auto place
  computerPlaceIfNeeded();
}

// ========================================
// END ROUND
// ========================================
function endRound() {
  // Reset for next roll
  gameState.hasRolled = false;
  gameState.hasPlaced = false;
  gameState.currentRoll = null;
  gameState.placementsThisRoll = 0;
  
  // For PvC: alternate who rolls next (player or computer)
  if (gameState.vsComputer) {
    gameState.roller = 1 - gameState.roller;
    // Just set the currentPlayer for the next roller; actual rolling/placement handled by roll button or auto-roll
    gameState.currentPlayer = gameState.roller; // 0 = player, 1 = computer
  } else {
    // PvP: alternate which player gets to roll next based on who rolled this round
    const nextRoller = gameState.lastRoller === null ? 0 : 1 - gameState.lastRoller;
    gameState.currentPlayer = nextRoller;
  }
  gameState.lastPlacement = null;

  // Render both boards
  renderBoard(0);
  renderBoard(1);

  // Update UI
  updateUI();
  updateMasking();

  // Do not show start-of-round overlay for either player in PvP mode.
}

// ========================================
// QUIT/RESET GAME
// ========================================
function quitGame() {
  // Reset game state
  gameState = {
    playerBoards: [Array(TOTAL_CELLS).fill(null), Array(TOTAL_CELLS).fill(null)],
    currentPlayer: 0,
    currentRoll: null,
    gameOver: false,
    hasRolled: false,
    hasPlaced: false,
    placementsThisRoll: 0,
    waitingForOverlay: false,
    vsComputer: false,
    lastPlacement: null
    ,
    lastRoller: null,
    roller: 0
  };

  // Clear any overlays
  const existingOverlays = document.querySelectorAll('[id="turnOverlay"]');
  existingOverlays.forEach(overlay => overlay.remove());

  // Reset UI
  rollBtn.disabled = false;
  undoBtn.disabled = false;
  nextBtn.disabled = false;
  quitBtn.disabled = false;
  rollBtn.classList.remove('disabled');
  undoBtn.classList.remove('disabled');
  nextBtn.classList.remove('disabled');

  // Clear boards
  grid1Element.innerHTML = '';
  grid2Element.innerHTML = '';

  // Show mode selection overlay
  modeOverlay.style.display = 'flex';
  gameContainer.style.display = 'none';

  // Recreate grid for next game
  createGrid();
}

// ========================================
// GAME OVER
// ========================================
function checkGameOver() {
  const board1Full = gameState.playerBoards[0].every((cell) => cell !== null);
  const board2Full = gameState.playerBoards[1].every((cell) => cell !== null);

  return board1Full && board2Full;
}

function handleGameOver() {
  gameState.gameOver = true;

  const score1 = calculateScore(gameState.playerBoards[0]);
  const score2 = calculateScore(gameState.playerBoards[1]);

  let winnerText;
  if (score1 > score2) {
    winnerText = 'Player 1 Wins! 🎉';
  } else if (score2 > score1) {
    winnerText = 'Player 2 Wins! 🎉';
  } else {
    winnerText = "It's a Tie! 🤝";
  }

  const margin = Math.abs(score1 - score2);
  const vibeText =
    score1 === score2
      ? 'Perfect balance!'
      : margin >= 60
        ? 'Dominating finish!'
        : margin <= 20
          ? 'Photo finish—so close!'
          : 'Solid win!';

  // Create game over overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    animation: fadeIn 0.4s ease;
  `;

  const message = document.createElement('div');
  message.style.cssText = `
    background: white;
    border-radius: 24px;
    padding: 40px;
    text-align: center;
    max-width: 500px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    animation: slideUp 0.5s cubic-bezier(0.25, 0.8, 0.4, 1);
  `;

  message.innerHTML = `
    <h1 style="color: #1f1f1f; font-size: 36px; margin: 0 0 10px 0;">${winnerText}</h1>
    <p style="color: #666; font-size: 18px; margin: 0 0 30px 0;">${vibeText}</p>
    <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 30px;">
      <div style="background: #f0f0f0; padding: 20px; border-radius: 12px; flex: 1;">
        <p style="color: #666; font-size: 14px; margin: 0 0 8px 0;">Player 1</p>
        <p style="color: #1f1f1f; font-size: 32px; font-weight: 800; margin: 0;">${score1}</p>
      </div>
      <div style="background: #f0f0f0; padding: 20px; border-radius: 12px; flex: 1;">
        <p style="color: #666; font-size: 14px; margin: 0 0 8px 0;">Player 2</p>
        <p style="color: #1f1f1f; font-size: 32px; font-weight: 800; margin: 0;">${score2}</p>
      </div>
    </div>
    <button onclick="location.reload()" style="
      padding: 15px 30px;
      font-size: 16px;
      font-weight: 800;
      background: #3b9afd;
      color: white;
      border: none;
      border-radius: 15px;
      cursor: pointer;
      box-shadow: 0 6px 0 #1e60a3;
      transition: all 0.1s ease;
    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'" onmousedown="this.style.boxShadow='0 0 0 #1e60a3'; this.style.transform='translateY(6px)'" onmouseup="this.style.boxShadow='0 6px 0 #1e60a3'; this.style.transform='translateY(0)'">
      Play Again 🎮
    </button>
  `;

  overlay.appendChild(message);
  document.body.appendChild(overlay);

  // Disable all buttons
  rollBtn.disabled = true;
  undoBtn.disabled = true;
  nextBtn.disabled = true;
  rollBtn.classList.add('disabled');
  undoBtn.classList.add('disabled');
  nextBtn.classList.add('disabled');
}

// ========================================
// SCORING & GROUP HIGHLIGHTING
// ========================================
function calculateScore(grid) {
  const N = SIZE;
  let totalScore = 0;

  const getCell = (row, col) => grid[row * N + col];

  // Row scoring
  for (let r = 0; r < N; r++) {
    let currentValue = getCell(r, 0);
    let count = 1;

    for (let c = 1; c <= N; c++) {
      if (c < N && getCell(r, c) === currentValue) {
        count++;
      } else {
        if (count >= 2 && currentValue !== null) {
          totalScore += currentValue * count;
        }
        if (c < N) {
          currentValue = getCell(r, c);
          count = 1;
        }
      }
    }
  }

  // Column scoring
  for (let c = 0; c < N; c++) {
    let currentValue = getCell(0, c);
    let count = 1;

    for (let r = 1; r <= N; r++) {
      if (r < N && getCell(r, c) === currentValue) {
        count++;
      } else {
        if (count >= 2 && currentValue !== null) {
          totalScore += currentValue * count;
        }
        if (r < N) {
          currentValue = getCell(r, c);
          count = 1;
        }
      }
    }
  }

  return totalScore;
}

function highlightScoringGroups(board, cells) {
  const N = SIZE;
  const getCell = (row, col) => board[row * N + col];
  const getCellIndex = (row, col) => row * N + col;

  // Clear all highlighting first
  cells.forEach(cell => {
    cell.classList.remove("group-highlight", "h-group", "v-group", "group-start", "group-middle", "group-end", "h-start", "v-start");
    cell.removeAttribute("data-group-size-h");
    cell.removeAttribute("data-group-size-v");
  });

  // Check horizontal groups (rows)
  for (let r = 0; r < N; r++) {
    let groupStart = 0;
    let currentValue = getCell(r, 0);
    
    for (let c = 1; c <= N; c++) {
      const cellValue = getCell(r, c);
      if (c < N && cellValue !== null && currentValue !== null && Number(cellValue) === Number(currentValue)) {
        // Continue group
      } else {
        // End of group
        const groupLength = c - groupStart;
        if (groupLength >= 2 && currentValue !== null) {
          // Mark this group
          for (let i = groupStart; i < c; i++) {
            const cellIdx = getCellIndex(r, i);
            cells[cellIdx].classList.add("group-highlight", "h-group");
            if (i === groupStart) {
              cells[cellIdx].classList.add("h-start");
              cells[cellIdx].setAttribute("data-group-size-h", groupLength);
            }
            else if (i === c - 1) cells[cellIdx].classList.add("group-end");
            else cells[cellIdx].classList.add("group-middle");
          }
        }
        if (c < N) {
          groupStart = c;
          currentValue = getCell(r, c);
        }
      }
    }
  }

  // Check vertical groups (columns)
  for (let c = 0; c < N; c++) {
    let groupStart = 0;
    let currentValue = getCell(0, c);
    
    for (let r = 1; r <= N; r++) {
      const cellValue = getCell(r, c);
      if (r < N && cellValue !== null && currentValue !== null && Number(cellValue) === Number(currentValue)) {
        // Continue group
      } else {
        // End of group
        const groupLength = r - groupStart;
        if (groupLength >= 2 && currentValue !== null) {
          // Mark this group (can coexist with h-group)
          for (let i = groupStart; i < r; i++) {
            const cellIdx = getCellIndex(i, c);
            cells[cellIdx].classList.add("group-highlight", "v-group");
            if (i === groupStart) {
              cells[cellIdx].classList.add("v-start");
              cells[cellIdx].setAttribute("data-group-size-v", groupLength);
            }
            else if (i === r - 1) cells[cellIdx].classList.add("group-end");
            else cells[cellIdx].classList.add("group-middle");
          }
        }
        if (r < N) {
          groupStart = r;
          currentValue = getCell(r, c);
        }
      }
    }
  }
}

// ========================================
// UI UPDATES
// ========================================
function updateUI() {
  const player1Turn = gameState.currentPlayer === 0;
  const hasRolled = gameState.currentRoll !== null;

  // Update button states
  const canRoll = hasRolled === false && !gameState.gameOver;
  const canUndo = gameState.lastPlacement !== null && gameState.hasPlaced;
  const canEndTurn = gameState.hasPlaced && !gameState.gameOver;

  rollBtn.disabled = !canRoll;
  undoBtn.disabled = !canUndo;
  nextBtn.disabled = !canEndTurn;

  rollBtn.classList.toggle('disabled', !canRoll);
  undoBtn.classList.toggle('disabled', !canUndo);
  nextBtn.classList.toggle('disabled', !canEndTurn);

  updateRollBadge();
  streamInfo(getGameInstruction());
}

// ========================================
// TURN OVERLAY
// ========================================
function showTurnOverlay(playerIndex) {
  // Skip overlay in vs Computer mode for Player 2 (computer's turn) - it plays automatically
  if (gameState.vsComputer && playerIndex === 1) {
    gameState.waitingForOverlay = false;
    return;
  }

  gameState.waitingForOverlay = true;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'turnOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.15);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 999;
    animation: fadeIn 0.3s ease;
  `;

  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    border-radius: 20px;
    padding: 40px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    animation: slideUp 0.4s cubic-bezier(0.25, 0.8, 0.4, 1);
  `;

  const playerLabel = playerIndex === 0 ? 'Player 1' : 'Player 2';

  content.innerHTML = `
    <h2 style="color: #1f1f1f; font-size: 32px; margin: 0 0 20px 0;">
      ${playerLabel}'s Turn
    </h2>
    <p style="color: #666; font-size: 16px; margin: 0 0 30px 0;">
      Pass the device and click to continue
    </p>
    <button id="beginTurnBtn" style="
      padding: 12px 32px;
      font-size: 16px;
      font-weight: 800;
      background: #f7941e; /* orange primary */
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.15s ease;
    " onmouseover="this.style.boxShadow='0 6px 16px rgba(0,0,0,0.2)'" onmouseout="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'">
      Ready ✓
    </button>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  document.getElementById('beginTurnBtn').addEventListener('click', () => {
    overlay.remove();
    gameState.waitingForOverlay = false;
    renderBoard(gameState.currentPlayer);
    updateMasking();
    updateUI();
  });
}

// ========================================
// MODE SELECTION & COMPUTER TURN
// ========================================
function setupModeSelection() {
  if (!modeOverlay) return;

  if (modePvP) {
    modePvP.addEventListener('click', () => {
      gameState.vsComputer = false;
      modeOverlay.style.display = 'none';
      if (gameContainer) gameContainer.style.display = 'block';
      gameState.waitingForOverlay = false;
      renderBoard(gameState.currentPlayer);
      updateMasking();
      updateUI();
    });
  }
  if (modePVC) {
    modePVC.addEventListener('click', () => {
      gameState.vsComputer = true;
      modeOverlay.style.display = 'none';
      if (gameContainer) gameContainer.style.display = 'block';
      gameState.waitingForOverlay = false;
      renderBoard(gameState.currentPlayer);
      updateMasking();
      updateUI();
    });
  }
}

function getComputerMove(currentBoard, rolledNumber) {
  const N = SIZE;
  const emptyIndices = [];
  currentBoard.forEach((val, idx) => {
    if (val === null) emptyIndices.push(idx);
  });

  if (emptyIndices.length === 0) return -1;

  let bestMoveIndex = -1;
  let maxScoreFound = -Infinity;
  let bestPositionScore = -Infinity;

  for (const index of emptyIndices) {
    const tempBoard = [...currentBoard];
    tempBoard[index] = rolledNumber;
    const simulatedScore = calculateScore(tempBoard);

    const row = Math.floor(index / N);
    const col = index % N;
    const neighborCount = getNeighborCount(row, col, N);
    const isCommon = rolledNumber >= 5 && rolledNumber <= 9;
    const positionBonus = isCommon ? neighborCount : (4 - neighborCount);

    if (simulatedScore > maxScoreFound || (simulatedScore === maxScoreFound && positionBonus > bestPositionScore)) {
      maxScoreFound = simulatedScore;
      bestPositionScore = positionBonus;
      bestMoveIndex = index;
    }
  }

  return bestMoveIndex;
}

function getNeighborCount(row, col, N) {
  let count = 0;
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]; // up, down, left, right
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
      count++;
    }
  }
  return count;
}

function computerPlaceIfNeeded() {
  if (!gameState.vsComputer) return;
  if (gameState.currentPlayer !== 1) return; // computer is Player 2
  if (gameState.currentRoll === null) return;
  if (gameState.hasPlaced) return;

  streamInfo('Computer is placing the number...');
  const board = gameState.playerBoards[1];
  const pick = getComputerMove(board, gameState.currentRoll);
  if (pick === -1) return; // No valid moves
  setTimeout(() => {
    gameState.playerBoards[1][pick] = gameState.currentRoll;
    gameState.hasPlaced = true;
    gameState.placementsThisRoll += 1;
    gameState.lastPlacement = null;
    renderBoard(1);
    updateMasking();
    updateUI();
    if (checkGameOver()) {
      handleGameOver();
      return;
    }
    
    // Check if both players have now placed this roll
    if (gameState.placementsThisRoll >= 2) {
      // Both placed — advance to next round
      setTimeout(() => {
        endRound();
        // If computer's turn to roll next, auto-roll and place, then player places
        if (gameState.vsComputer && gameState.roller === 1 && gameState.currentRoll === null) {
          streamInfo('Computer is rolling the dice...');
          setTimeout(() => {
            const final = rollDice();
            animateBadge(final, 700, () => {
              gameState.lastRoller = 1;
              gameState.currentRoll = final;
              gameState.hasRolled = true;
              gameState.hasPlaced = false;
              updateRollBadge();
              updateUI();
              renderBoard(1);
              // Computer places automatically after its own roll
              setTimeout(() => {
                computerPlaceIfNeeded();
              }, 300);
            });
          }, 300);
        }
      }, 350);
    } else {
      // Only one player placed so far — switch to other player to place same roll
      gameState.currentPlayer = 0;
      gameState.hasPlaced = false;
      updateMasking();
      updateUI();
      renderBoard(0);
      enableEmptyCells(0);
    }
  }, 900);
}

// ========================================
// RULES MODAL
// ========================================
function showRulesModal() {
  rulesModal.classList.add('show');
}

function closeRulesModal() {
  rulesModal.classList.remove('show');
}

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  rollBtn.addEventListener('click', handleRollClick);
  undoBtn.addEventListener('click', handleUndo);
  nextBtn.addEventListener('click', endTurn);
  quitBtn.addEventListener('click', quitGame);
  infoBtn.addEventListener('click', showRulesModal);
  closeRulesBtn.addEventListener('click', closeRulesModal);
  rulesModal.addEventListener('click', function(e) {
    if (e.target === rulesModal) {
      closeRulesModal();
    }
  });

  // Help button removed - no rules popup on dice click
});

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!rollBtn.disabled) rollBtn.click();
  }
});

// Handle window resize to reapply mobile masking
window.addEventListener('resize', function() {
  updateMasking();
});

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // Build grids
  createGrid();

  // Render both boards
  renderBoard(0);
  renderBoard(1);

  // Update UI and masking
  updateMasking();
  updateUI();

  // Show mode selection before starting and hide game until chosen
  if (modeOverlay) {
    modeOverlay.style.display = 'flex';
    if (gameContainer) gameContainer.style.display = 'none';
    setupModeSelection();
  } else {
    showTurnOverlay(0);
  }

  console.log('Neighbours Game initialized! 🎮');
  console.log('Game State:', gameState);
});