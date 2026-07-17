import { GameEngine, MAX_LEVEL, LEVEL_CLEAR_SCORE } from './gameEngine.js';
import { BOARD_ROWS, BOARD_COLS, BASE_OFFSETS, TETROMINO_COLORS } from './tetromino.js';
import { sound } from './audio.js';
import { music } from './music.js';
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
const levelScoreEl = document.getElementById('level-score');
const levelProgressFill = document.getElementById('level-progress-fill');
const pauseBtn = document.getElementById('pause-btn');
const restartBtn = document.getElementById('restart-btn');
const soundBtn = document.getElementById('sound-btn');
const musicBtn = document.getElementById('music-btn');
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
const effects = new EffectsManager();
music.getLevel = () => engine.scoreState.level;
let dropTimer = null;
let animationFrame = null;
let levelUpHideTimer = null;

const REPEATABLE = new Set(['left', 'right', 'down']);
const HOLD_DELAY_MS = 220;
const HOLD_INTERVAL_MS = 70;

/** Actions that must not reset the gravity timer (keep falling while rotating/moving). */
const NON_RESET_ACTIONS = new Set(['left', 'right', 'rotate']);

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

function stopDropLoop() {
  if (dropTimer) clearTimeout(dropTimer);
  dropTimer = null;
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

const WATERMARK_TEXT = 'NAMCHON';
const WATERMARK_FONT = '"Nanum Brush Script", "Segoe Script", cursive';

function loadWatermarkFont() {
  if (!document.fonts?.load) return;
  document.fonts.load(`80px ${WATERMARK_FONT}`, WATERMARK_TEXT).then(() => {
    render();
  }).catch(() => {});
}

function drawWatermark(ctx, width, height) {
  ctx.save();

  const trial = 100;
  ctx.font = `${trial}px ${WATERMARK_FONT}`;
  const measured = ctx.measureText(WATERMARK_TEXT).width || trial;
  const fontSize = Math.min(((width * 0.9) / measured) * trial, height * 0.16);

  ctx.translate(width / 2, height / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px ${WATERMARK_FONT}`;

  ctx.save();
  ctx.rotate(-0.1);
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#9ecfff';
  ctx.font = `${fontSize * 1.12}px ${WATERMARK_FONT}`;
  ctx.fillText(WATERMARK_TEXT, fontSize * 0.06, fontSize * 0.1);
  ctx.restore();

  ctx.rotate(-0.04);
  ctx.globalAlpha = 0.1;
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

function showLevelUpToast() {
  levelUpText.textContent = `LEVEL ${engine.scoreState.level}!`;
  levelUpOverlay.classList.remove('hidden');

  if (levelUpHideTimer) clearTimeout(levelUpHideTimer);
  levelUpHideTimer = setTimeout(() => {
    levelUpOverlay.classList.add('hidden');
  }, 900);
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
  soundBtn.textContent = sound.muted ? '🔇' : '🔊';
  musicBtn.textContent = '🎵';
  musicBtn.classList.toggle('off', !music.enabled);
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
        showLevelUpToast();
        restartDropLoop();
        break;
      case 'gameOver':
        music.stop();
        sound.gameOver();
        vibrate([80, 60, 120]);
        effects.shake(9, 400);
        stopDropLoop();
        break;
      default:
        break;
    }
  }

  if (engine.phase === 'cleared') {
    stopDropLoop();
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

function afterAction(action) {
  render();
  // Keep gravity running during rotate / left / right — do not reset the fall timer.
  if (!NON_RESET_ACTIONS.has(action)) {
    restartDropLoop();
  }
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
  afterAction(action);
  return true;
}

function restartFromLevelOne() {
  stopDropLoop();
  engine.reset(1);
  effects.reset();
  render();
  restartDropLoop();
  music.stop();
  music.start();
}

function restartAfterFailure() {
  stopDropLoop();
  engine.restartAfterFailure();
  effects.reset();
  render();
  restartDropLoop();
  music.stop();
  music.start();
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
    if (engine.phase === 'gameOver' || engine.phase === 'cleared') return;

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
  const tryUnlock = () => {
    sound.unlock();
    if (sound.unlocked) {
      document.removeEventListener('touchend', tryUnlock);
      document.removeEventListener('pointerup', tryUnlock);
      if (engine.phase === 'playing') music.start();
    }
  };

  document.addEventListener('touchend', tryUnlock);
  document.addEventListener('pointerup', tryUnlock);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && sound.ctx && sound.ctx.state !== 'running') {
      sound.ctx.resume();
    }
  });
}

function bindMobileGuards() {
  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.target.closest('button, a, input, textarea')) return;
      event.preventDefault();
    },
    { passive: false },
  );

  document.addEventListener('gesturestart', (event) => event.preventDefault());

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
  if (engine.phase === 'gameOver' || engine.phase === 'cleared') return;
  engine.togglePause();
  sound.pause();
  if (engine.phase === 'playing') {
    restartDropLoop();
    music.start();
  } else {
    stopDropLoop();
    music.stop();
  }
  render();
}

pauseBtn.addEventListener('click', () => {
  sound.unlock();
  togglePause();
});

restartBtn.addEventListener('click', () => {
  sound.unlock();
  restartFromLevelOne();
});

playAgainBtn.addEventListener('click', () => {
  sound.unlock();
  restartAfterFailure();
});

clearedRestartBtn.addEventListener('click', () => {
  sound.unlock();
  restartFromLevelOne();
});

soundBtn.addEventListener('click', () => {
  sound.unlock();
  const muted = sound.toggleMute();
  soundBtn.textContent = muted ? '🔇' : '🔊';
  if (muted) music.stop();
  else if (music.enabled && engine.phase === 'playing') music.start();
});

musicBtn.addEventListener('click', () => {
  sound.unlock();
  const enabled = music.toggle();
  if (enabled && engine.phase === 'playing') music.start();
  musicBtn.classList.toggle('off', !enabled);
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
