import { GameEngine } from './gameEngine.js';
import { BOARD_ROWS, BOARD_COLS, BASE_OFFSETS, TETROMINO_COLORS } from './tetromino.js';

const boardCanvas = document.getElementById('board');
const nextCanvas = document.getElementById('next-piece');
const boardCtx = boardCanvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again-btn');

const engine = new GameEngine();
let dropTimer = null;

const REPEATABLE = new Set(['left', 'right', 'down']);
const HOLD_DELAY_MS = 220;
const HOLD_INTERVAL_MS = 70;

function scheduleDrop() {
  if (dropTimer) clearTimeout(dropTimer);
  if (engine.phase !== 'playing') return;

  dropTimer = setTimeout(() => {
    engine.tick();
    render();
    scheduleDrop();
  }, engine.dropInterval);
}

function restartDropLoop() {
  scheduleDrop();
}

function resizeBoard() {
  const rect = boardCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  boardCanvas.width = Math.max(1, Math.floor(rect.width * dpr));
  boardCanvas.height = Math.max(1, Math.floor(rect.height * dpr));
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

function updateUI() {
  scoreEl.textContent = engine.scoreState.score;
  levelEl.textContent = engine.scoreState.level;
  linesEl.textContent = engine.scoreState.linesCleared;
  pauseBtn.textContent = engine.phase === 'paused' ? 'RESUME' : 'PAUSE';
  pauseOverlay.classList.toggle('hidden', engine.phase !== 'paused');
  gameOverOverlay.classList.toggle('hidden', engine.phase !== 'gameOver');

  if (engine.phase === 'gameOver') {
    finalScoreEl.textContent = engine.scoreState.score;
  }

  renderNextPiece();
}

function render() {
  renderBoard();
  updateUI();
}

function afterAction() {
  render();
  restartDropLoop();
}

function runAction(action) {
  if (engine.phase !== 'playing') return false;

  const actions = {
    left: () => engine.moveLeft(),
    right: () => engine.moveRight(),
    rotate: () => engine.rotate(),
    down: () => engine.moveDown(),
    drop: () => engine.hardDrop(),
  };

  if (!actions[action]) return false;
  actions[action]();
  afterAction();
  return true;
}

function restartGame() {
  engine.reset();
  render();
  restartDropLoop();
}

function bindPointerControl(button, onPress) {
  let holdTimeout = null;
  let holdInterval = null;
  let pressed = false;
  let pointerId = null;

  const clearHold = () => {
    if (holdTimeout) clearTimeout(holdTimeout);
    if (holdInterval) clearInterval(holdInterval);
    holdTimeout = null;
    holdInterval = null;
  };

  const endPress = () => {
    if (!pressed) return;
    pressed = false;
    pointerId = null;
    button.classList.remove('is-pressed');
    clearHold();
  };

  button.addEventListener('pointerdown', (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();
    if (pressed) return;

    pressed = true;
    pointerId = event.pointerId;
    button.classList.add('is-pressed');
    button.setPointerCapture?.(event.pointerId);
    onPress(true);

    if (REPEATABLE.has(button.dataset.action)) {
      holdTimeout = setTimeout(() => {
        holdInterval = setInterval(() => onPress(false), HOLD_INTERVAL_MS);
      }, HOLD_DELAY_MS);
    }
  });

  const stop = (event) => {
    if (pointerId !== null && event.pointerId !== pointerId) return;
    endPress();
  };

  button.addEventListener('pointerup', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('pointerleave', (event) => {
    if (pointerId !== null && event.pointerId === pointerId) endPress();
  });

  // Prevent iOS long-press callout / context menu on controls
  button.addEventListener('contextmenu', (event) => event.preventDefault());
}

function bindControlButtons() {
  document.querySelectorAll('[data-action]').forEach((button) => {
    bindPointerControl(button, () => {
      runAction(button.dataset.action);
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
    if (engine.phase === 'gameOver') return;

    if (event.code === 'KeyP') {
      engine.togglePause();
      if (engine.phase === 'playing') restartDropLoop();
      else if (dropTimer) clearTimeout(dropTimer);
      render();
      return;
    }

    if (engine.phase !== 'playing') return;

    const action = keyMap[event.key];
    if (!action) return;

    event.preventDefault();
    runAction(action);
  });
}

function bindMobileGuards() {
  // Stop Safari rubber-band scroll while playing
  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.target.closest('button, a, input, textarea')) return;
      event.preventDefault();
    },
    { passive: false },
  );

  document.addEventListener('gesturestart', (event) => event.preventDefault());

  // Keep layout correct when iOS Safari chrome shows/hides
  window.visualViewport?.addEventListener('resize', resizeBoard);
  window.addEventListener('orientationchange', () => {
    setTimeout(resizeBoard, 250);
  });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Offline install is best-effort; game still works without it.
    });
  });
}

pauseBtn.addEventListener('click', () => {
  if (engine.phase === 'gameOver') return;
  engine.togglePause();
  if (engine.phase === 'playing') restartDropLoop();
  else if (dropTimer) clearTimeout(dropTimer);
  render();
});

restartBtn.addEventListener('click', restartGame);
playAgainBtn.addEventListener('click', restartGame);

window.addEventListener('resize', resizeBoard);

bindControlButtons();
bindKeyboard();
bindMobileGuards();
registerServiceWorker();
resizeBoard();
restartDropLoop();
