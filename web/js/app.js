import { GameEngine } from './gameEngine.js';
import { BOARD_ROWS, BOARD_COLS, BASE_OFFSETS, TETROMINO_COLORS } from './tetromino.js';
import { sound } from './audio.js';
import { EffectsManager } from './effects.js';

// roundRect is missing on older Android WebView/Chrome (<99); without this
// the whole board fails to draw there.
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const radius = Math.min(typeof r === 'number' ? r : r?.[0] ?? 0, w / 2, h / 2);
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
    return this;
  };
}

const boardCanvas = document.getElementById('board');
const nextCanvas = document.getElementById('next-piece');
const boardCtx = boardCanvas.getContext('2d');
const nextCtx = nextCanvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const soundBtn = document.getElementById('sound-btn');
const pauseOverlay = document.getElementById('pause-overlay');
const gameOverOverlay = document.getElementById('game-over-overlay');
const finalScoreEl = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again-btn');

const engine = new GameEngine();
const effects = new EffectsManager();
let dropTimer = null;
let animationFrame = null;

const REPEATABLE = new Set(['left', 'right', 'down']);
const HOLD_DELAY_MS = 220;
const HOLD_INTERVAL_MS = 70;

const CLEAR_LABELS = { 1: 'SINGLE', 2: 'DOUBLE!', 3: 'TRIPLE!', 4: 'TETRIS!!' };

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

  // Subtle top-light for a 3D feel
  const gloss = ctx.createLinearGradient(x, y, x, y + size);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
  gloss.addColorStop(0.45, 'rgba(255, 255, 255, 0)');
  gloss.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.roundRect(x + padding, y + padding, size - padding * 2, size - padding * 2, radius);
  ctx.fill();

  if (highlighted) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

const WATERMARK_TEXT = '남촌';
const WATERMARK_FONT = '"Nanum Brush Script", "Segoe Script", cursive';

function loadWatermarkFont() {
  if (!document.fonts?.load) return;
  // Canvas text does not trigger webfont loading, so load it explicitly
  // and repaint once the brush font is available.
  document.fonts.load(`80px ${WATERMARK_FONT}`, WATERMARK_TEXT).then(() => {
    render();
  }).catch(() => {});
}

// Faint doubled brush-script watermark in the middle of the board.
function drawWatermark(ctx, width, height) {
  const fontSize = Math.min(width * 0.42, height * 0.22);

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px ${WATERMARK_FONT}`;

  // Back layer: slightly offset, rotated and larger — the "double" stroke.
  ctx.save();
  ctx.rotate(-0.12);
  ctx.globalAlpha = 0.045;
  ctx.fillStyle = '#9ecfff';
  ctx.font = `${fontSize * 1.12}px ${WATERMARK_FONT}`;
  ctx.fillText(WATERMARK_TEXT, fontSize * 0.05, fontSize * 0.06);
  ctx.restore();

  // Front layer.
  ctx.rotate(-0.05);
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(WATERMARK_TEXT, 0, 0);

  ctx.restore();
}

function renderBoard() {
  const width = boardCanvas.clientWidth;
  const height = boardCanvas.clientHeight;
  const cellWidth = width / BOARD_COLS;
  const cellHeight = height / BOARD_ROWS;
  const cells = engine.getRenderCells();

  boardCtx.clearRect(0, 0, width, height);

  const shake = effects.shakeOffset();
  boardCtx.save();
  boardCtx.translate(shake.x, shake.y);

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const x = col * cellWidth;
      const y = row * cellHeight;

      boardCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      boardCtx.beginPath();
      boardCtx.roundRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2, 2);
      boardCtx.fill();
    }
  }

  drawWatermark(boardCtx, width, height);

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const color = cells[row][col];
      if (color) {
        drawBlock(boardCtx, col * cellWidth, row * cellHeight, cellWidth, color);
      }
    }
  }

  effects.draw(boardCtx, cellWidth, cellHeight, width, height);
  boardCtx.restore();
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
  soundBtn.textContent = sound.muted ? '🔇' : '🔊';
  pauseOverlay.classList.toggle('hidden', engine.phase !== 'paused');
  gameOverOverlay.classList.toggle('hidden', engine.phase !== 'gameOver');

  if (engine.phase === 'gameOver') {
    finalScoreEl.textContent = engine.scoreState.score;
  }

  renderNextPiece();
}

// Haptic feedback on devices that support it (mostly Android).
function vibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers throw outside user gestures; ignore.
  }
}

function handleEvents() {
  for (const event of engine.consumeEvents()) {
    switch (event.type) {
      case 'move':
        sound.move();
        break;
      case 'rotate':
        sound.rotate();
        break;
      case 'softDrop':
        sound.softDrop();
        break;
      case 'hardDrop':
        sound.hardDrop();
        vibrate(15);
        if (event.rows >= 4) effects.shake(4, 180);
        break;
      case 'lock':
        sound.lock();
        break;
      case 'lineClear': {
        sound.lineClear(event.count);
        vibrate(event.count >= 4 ? [40, 50, 60] : [30, 30, 30]);
        effects.burstRows(event.rows, BOARD_COLS, event.boardBeforeClear);
        effects.shake(event.count >= 4 ? 8 : 3 + event.count, 240);

        const label = CLEAR_LABELS[event.count] ?? `${event.count} LINES`;
        const midRow = event.rows.reduce((sum, r) => sum + r, 0) / event.rows.length;
        effects.scorePopup(`${label} +${event.points}`, midRow, BOARD_COLS / 2);
        document.body.classList.remove('flash');
        if (event.count >= 2) {
          void document.body.offsetWidth;
          document.body.classList.add('flash');
        }
        break;
      }
      case 'levelUp':
        sound.levelUp();
        effects.levelFlash();
        effects.scorePopup(`LEVEL ${event.level}!`, BOARD_ROWS / 3, BOARD_COLS / 2);
        break;
      case 'gameOver':
        sound.gameOver();
        vibrate([80, 60, 120]);
        effects.shake(9, 400);
        break;
      default:
        break;
    }
  }
}

function animationLoop() {
  animationFrame = null;
  renderBoard();
  if (effects.active) {
    animationFrame = requestAnimationFrame(animationLoop);
  }
}

function kickAnimation() {
  if (!animationFrame && effects.active) {
    animationFrame = requestAnimationFrame(animationLoop);
  }
}

function render() {
  handleEvents();
  renderBoard();
  updateUI();
  kickAnimation();
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
    down: () => engine.moveDown({ soft: true }),
    drop: () => engine.hardDrop(),
  };

  if (!actions[action]) return false;
  actions[action]();
  afterAction();
  return true;
}

function restartGame() {
  engine.reset();
  effects.reset();
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
    sound.unlock();
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
    sound.unlock();
    if (engine.phase === 'gameOver') return;

    if (event.code === 'KeyP') {
      togglePause();
      return;
    }

    if (engine.phase !== 'playing') return;

    const action = keyMap[event.key];
    if (!action) return;

    event.preventDefault();
    runAction(action);
  });
}

function bindAudioUnlock() {
  // iOS Safari only enables audio from inside a user gesture. touchend is
  // the most reliable unlock event; keep listening until it succeeds.
  const tryUnlock = () => {
    sound.unlock();
    if (sound.unlocked) {
      document.removeEventListener('touchend', tryUnlock);
      document.removeEventListener('pointerup', tryUnlock);
    }
  };

  document.addEventListener('touchend', tryUnlock);
  document.addEventListener('pointerup', tryUnlock);

  // Coming back from background can leave the context suspended.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && sound.ctx && sound.ctx.state !== 'running') {
      sound.ctx.resume();
    }
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

function togglePause() {
  if (engine.phase === 'gameOver') return;
  engine.togglePause();
  sound.pause();
  if (engine.phase === 'playing') restartDropLoop();
  else if (dropTimer) clearTimeout(dropTimer);
  render();
}

pauseBtn.addEventListener('click', () => {
  sound.unlock();
  togglePause();
});

restartBtn.addEventListener('click', () => {
  sound.unlock();
  restartGame();
});

playAgainBtn.addEventListener('click', () => {
  sound.unlock();
  restartGame();
});

soundBtn.addEventListener('click', () => {
  sound.unlock();
  const muted = sound.toggleMute();
  soundBtn.textContent = muted ? '🔇' : '🔊';
});

window.addEventListener('resize', resizeBoard);

bindControlButtons();
bindKeyboard();
bindAudioUnlock();
bindMobileGuards();
registerServiceWorker();
loadWatermarkFont();
resizeBoard();
restartDropLoop();
