import { GameEngine, MAX_LEVEL, LEVEL_CLEAR_SCORE } from './gameEngine.js';
import { BOARD_ROWS, BOARD_COLS, BASE_OFFSETS, TETROMINO_COLORS } from './tetromino.js';

const boardCanvas = document.getElementById('board');
const nextCanvas = document.getElementById('next-piece');
const boardCtx = boardCanvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const levelScoreEl = document.getElementById('level-score');
const levelProgressFill = document.getElementById('level-progress-fill');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const levelUpOverlay = document.getElementById('level-up-overlay');
const levelUpText = document.getElementById('level-up-text');
const gameOverOverlay = document.getElementById('game-over-overlay');
const clearedOverlay = document.getElementById('cleared-overlay');
const finalScoreEl = document.getElementById('final-score');
const clearedScoreEl = document.getElementById('cleared-score');
const retryHintEl = document.getElementById('retry-hint');
const playAgainBtn = document.getElementById('play-again-btn');
const clearedRestartBtn = document.getElementById('cleared-restart-btn');

const engine = new GameEngine();
let dropTimer = null;
let levelUpHideTimer = null;

/** Actions that must not reset the gravity timer (keep falling while rotating/moving). */
const NON_RESET_ACTIONS = new Set(['left', 'right', 'rotate']);

function scheduleDrop() {
  if (dropTimer) clearTimeout(dropTimer);
  if (engine.phase !== 'playing') return;

  dropTimer = setTimeout(() => {
    engine.tick();
    render();
    handleEngineEvents();
    scheduleDrop();
  }, engine.dropInterval);
}

function restartDropLoop() {
  scheduleDrop();
}

function stopDropLoop() {
  if (dropTimer) clearTimeout(dropTimer);
  dropTimer = null;
}

function resizeBoard() {
  const rect = boardCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  boardCanvas.width = rect.width * dpr;
  boardCanvas.height = rect.height * dpr;
  boardCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

function drawBlock(ctx, x, y, size, color, highlighted = false) {
  const padding = 1;
  const radius = Math.max(2, size * 0.12);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
  ctx.fill();

  if (highlighted) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function renderBoard() {
  const width = boardCanvas.clientWidth;
  const height = boardCanvas.clientHeight;
  const cellWidth = width / BOARD_COLS;
  const cellHeight = height / BOARD_ROWS;
  const cells = engine.getRenderCells();

  boardCtx.clearRect(0, 0, width, height);

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const x = col * cellWidth;
      const y = row * cellHeight;

      boardCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      boardCtx.beginPath();
      boardCtx.roundRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2, 2);
      boardCtx.fill();

      const color = cells[row][col];
      if (color) {
        drawBlock(boardCtx, x, y, cellWidth, color);
      }
    }
  }
}

function renderNextPiece() {
  const type = engine.nextPieceType;
  const offsets = BASE_OFFSETS[type];
  const color = TETROMINO_COLORS[type];
  const size = nextCanvas.width;

  nextCtx.clearRect(0, 0, size, size);

  const minRow = Math.min(...offsets.map(([r]) => r));
  const maxRow = Math.max(...offsets.map(([r]) => r));
  const minCol = Math.min(...offsets.map(([, c]) => c));
  const maxCol = Math.max(...offsets.map(([, c]) => c));

  const pieceRows = maxRow - minRow + 1;
  const pieceCols = maxCol - minCol + 1;
  const cellSize = Math.min((size - 16) / pieceCols, (size - 16) / pieceRows);
  const offsetX = (size - pieceCols * cellSize) / 2;
  const offsetY = (size - pieceRows * cellSize) / 2;

  for (const [row, col] of offsets) {
    drawBlock(
      nextCtx,
      offsetX + (col - minCol) * cellSize,
      offsetY + (row - minRow) * cellSize,
      cellSize,
      color,
    );
  }
}

function showLevelUpToast() {
  levelUpText.textContent = `LEVEL ${engine.scoreState.level}!`;
  levelUpOverlay.classList.remove('hidden');

  if (levelUpHideTimer) clearTimeout(levelUpHideTimer);
  levelUpHideTimer = setTimeout(() => {
    levelUpOverlay.classList.add('hidden');
  }, 900);
}

function handleEngineEvents() {
  if (engine.justLeveledUp) {
    showLevelUpToast();
    engine.justLeveledUp = false;
    // Level speed changed — reschedule gravity with new interval.
    restartDropLoop();
  }

  if (engine.phase === 'cleared' || engine.phase === 'gameOver') {
    stopDropLoop();
  }
}

function updateUI() {
  const { score, level, linesCleared, levelScore } = engine.scoreState;
  const progress = Math.min(LEVEL_CLEAR_SCORE, levelScore);

  scoreEl.textContent = score;
  levelEl.textContent = `${level} / ${MAX_LEVEL}`;
  linesEl.textContent = linesCleared;
  levelScoreEl.textContent = `${progress} / ${LEVEL_CLEAR_SCORE}`;
  levelProgressFill.style.width = `${(progress / LEVEL_CLEAR_SCORE) * 100}%`;

  pauseBtn.textContent = engine.phase === 'paused' ? 'RESUME' : 'PAUSE';
  pauseOverlay.classList.toggle('hidden', engine.phase !== 'paused');
  gameOverOverlay.classList.toggle('hidden', engine.phase !== 'gameOver');
  clearedOverlay.classList.toggle('hidden', engine.phase !== 'cleared');

  if (engine.phase === 'gameOver') {
    finalScoreEl.textContent = score;
    const failed = engine.failedLevel ?? level;
    const retryLevel = Math.max(1, failed - 1);
    retryHintEl.textContent = failed === 1
      ? '레벨 1부터 다시 시작합니다'
      : `레벨 ${retryLevel}부터 다시 시작합니다`;
  }

  if (engine.phase === 'cleared') {
    clearedScoreEl.textContent = score;
  }

  renderNextPiece();
}

function render() {
  renderBoard();
  updateUI();
}

/**
 * @param {string} action
 */
function afterAction(action) {
  render();
  handleEngineEvents();

  // Keep gravity running during rotate / left / right — do not reset the fall timer.
  if (!NON_RESET_ACTIONS.has(action)) {
    restartDropLoop();
  }
}

function restartFromLevelOne() {
  stopDropLoop();
  engine.reset(1);
  render();
  restartDropLoop();
}

function restartAfterFailure() {
  stopDropLoop();
  engine.restartAfterFailure();
  render();
  restartDropLoop();
}

function bindControlButtons() {
  const actions = {
    left: () => engine.moveLeft(),
    right: () => engine.moveRight(),
    rotate: () => engine.rotate(),
    down: () => engine.moveDown(),
    drop: () => engine.hardDrop(),
  };

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (engine.phase !== 'playing') return;
      const action = button.dataset.action;
      actions[action]?.();
      afterAction(action);
    });
  });
}

function bindKeyboard() {
  const keyMap = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowDown: 'down',
    ArrowUp: 'rotate',
    ' ': 'drop',
    z: 'rotate',
    Z: 'rotate',
    x: 'rotate',
    X: 'rotate',
  };

  window.addEventListener('keydown', (event) => {
    if (engine.phase === 'gameOver' || engine.phase === 'cleared') return;

    if (event.code === 'KeyP') {
      engine.togglePause();
      if (engine.phase === 'playing') restartDropLoop();
      else stopDropLoop();
      render();
      return;
    }

    if (engine.phase !== 'playing') return;

    const action = keyMap[event.key];
    if (!action) return;

    event.preventDefault();
    const actions = {
      left: () => engine.moveLeft(),
      right: () => engine.moveRight(),
      rotate: () => engine.rotate(),
      down: () => engine.moveDown(),
      drop: () => engine.hardDrop(),
    };
    actions[action]?.();
    afterAction(action);
  });
}

pauseBtn.addEventListener('click', () => {
  if (engine.phase === 'gameOver' || engine.phase === 'cleared') return;
  engine.togglePause();
  if (engine.phase === 'playing') restartDropLoop();
  else stopDropLoop();
  render();
});

restartBtn.addEventListener('click', restartFromLevelOne);
playAgainBtn.addEventListener('click', restartAfterFailure);
clearedRestartBtn.addEventListener('click', restartFromLevelOne);

window.addEventListener('resize', resizeBoard);

bindControlButtons();
bindKeyboard();
resizeBoard();
restartDropLoop();
