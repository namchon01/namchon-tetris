import { createBoard, isValid, placePiece, clearLines } from './board.js';
import {
  createPiece,
  movePiece,
  rotatePiece,
  randomType,
  absolutePositions,
  TETROMINO_COLORS,
} from './tetromino.js';

export const MAX_LEVEL = 5;
export const LEVEL_CLEAR_SCORE = 2000;
export const BASE_DROP_INTERVAL = 1000;
/** Each level is 10% faster than the previous (interval × 0.9). */
export const LEVEL_SPEED_FACTOR = 0.9;

const WALL_KICK_OFFSETS = [
  [0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [0, -2], [0, 2],
];

function createScoreState(level = 1) {
  return {
    score: 0,
    levelScore: 0,
    level,
    linesCleared: 0,
  };
}

function addScore(scoreState, points) {
  if (points <= 0) return false;

  scoreState.score += points;
  scoreState.levelScore += points;
  return tryAdvanceLevel(scoreState);
}

function tryAdvanceLevel(scoreState) {
  let advanced = false;

  while (
    scoreState.levelScore >= LEVEL_CLEAR_SCORE
    && scoreState.level < MAX_LEVEL
  ) {
    scoreState.levelScore -= LEVEL_CLEAR_SCORE;
    scoreState.level += 1;
    advanced = true;
  }

  return advanced;
}

export class GameEngine {
  constructor() {
    this.reset(1);
  }

  reset(startLevel = 1) {
    const level = Math.min(MAX_LEVEL, Math.max(1, startLevel));
    this.board = createBoard();
    this.activePiece = null;
    this.nextPieceType = randomType();
    this.phase = 'playing';
    this.scoreState = createScoreState(level);
    this.events = [];
    this.failedLevel = null;
    this.justLeveledUp = false;
    this.justClearedGame = false;
    this.spawnNextPiece();
  }

  /** Restart after game over: previous stage (or stay on 1). */
  restartAfterFailure() {
    const failed = this.failedLevel ?? this.scoreState.level;
    const previous = Math.max(1, failed - 1);
    this.reset(previous);
  }

  get dropInterval() {
    const level = this.scoreState.level;
    return Math.max(
      80,
      Math.round(BASE_DROP_INTERVAL * LEVEL_SPEED_FACTOR ** (level - 1)),
    );
  }

  get levelProgress() {
    return Math.min(LEVEL_CLEAR_SCORE, this.scoreState.levelScore);
  }

  get isMaxLevelCleared() {
    return (
      this.scoreState.level === MAX_LEVEL
      && this.scoreState.levelScore >= LEVEL_CLEAR_SCORE
    );
  }

  emit(event) {
    this.events.push(event);
  }

  consumeEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }

  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
  }

  performMove(transform) {
    if (!this.activePiece) return false;
    const moved = transform(this.activePiece);
    if (!isValid(moved, this.board)) return false;
    this.activePiece = moved;
    return true;
  }

  moveLeft() {
    const moved = this.performMove((piece) => movePiece(piece, 0, -1));
    if (moved) this.emit({ type: 'move' });
    return moved;
  }

  moveRight() {
    const moved = this.performMove((piece) => movePiece(piece, 0, 1));
    if (moved) this.emit({ type: 'move' });
    return moved;
  }

  moveDown({ soft = false } = {}) {
    if (!this.activePiece) return false;

    const moved = movePiece(this.activePiece, 1, 0);
    if (isValid(moved, this.board)) {
      this.activePiece = moved;
      if (soft) {
        this.applyScore(1);
        this.emit({ type: 'softDrop' });
      }
      return true;
    }

    this.lockPiece();
    return false;
  }

  rotate() {
    if (!this.activePiece) return false;

    const rotated = rotatePiece(this.activePiece);
    for (const [dRow, dCol] of WALL_KICK_OFFSETS) {
      const candidate = movePiece(rotated, dRow, dCol);
      if (isValid(candidate, this.board)) {
        this.activePiece = candidate;
        this.emit({ type: 'rotate' });
        return true;
      }
    }

    return false;
  }

  hardDrop() {
    if (!this.activePiece) return;

    let piece = this.activePiece;
    let droppedRows = 0;

    while (true) {
      const moved = movePiece(piece, 1, 0);
      if (isValid(moved, this.board)) {
        piece = moved;
        droppedRows += 1;
      } else {
        break;
      }
    }

    this.activePiece = piece;
    this.emit({ type: 'hardDrop', rows: droppedRows });
    this.lockPiece(droppedRows * 2);
  }

  tick() {
    if (this.phase !== 'playing') return;
    this.moveDown();
  }

  applyScore(points) {
    this.justLeveledUp = false;
    this.justClearedGame = false;

    const levelBefore = this.scoreState.level;
    const advanced = addScore(this.scoreState, points);

    if (this.isMaxLevelCleared) {
      this.phase = 'cleared';
      this.activePiece = null;
      this.justClearedGame = true;
      this.emit({ type: 'levelUp', level: this.scoreState.level });
      return true;
    }

    if (advanced) {
      this.justLeveledUp = true;
      this.emit({ type: 'levelUp', level: this.scoreState.level });
    }

    return this.scoreState.level > levelBefore;
  }

  spawnNextPiece() {
    if (this.phase === 'cleared' || this.phase === 'gameOver') return;

    const type = this.nextPieceType;
    this.nextPieceType = randomType();

    const piece = createPiece(type, 0, 3, 0);
    if (isValid(piece, this.board)) {
      this.activePiece = piece;
    } else {
      this.activePiece = null;
      this.failedLevel = this.scoreState.level;
      this.phase = 'gameOver';
      this.emit({ type: 'gameOver' });
    }
  }

  lockPiece(bonusPoints = 0) {
    if (!this.activePiece) return;
    if (this.phase === 'cleared' || this.phase === 'gameOver') return;

    const lockedPositions = absolutePositions(this.activePiece);
    this.board = placePiece(this.board, this.activePiece);
    this.activePiece = null;

    const fullRows = [];
    this.board.forEach((row, index) => {
      if (row.every((cell) => cell !== null)) fullRows.push(index);
    });
    const boardBeforeClear = this.board.map((row) => [...row]);

    const result = clearLines(this.board);
    this.board = result.board;

    this.justLeveledUp = false;
    this.justClearedGame = false;

    const pointsByCount = { 1: 100, 2: 300, 3: 500, 4: 800 };
    let linePoints = 0;

    if (result.cleared > 0) {
      linePoints = (pointsByCount[result.cleared] ?? 100 * result.cleared)
        * this.scoreState.level;
      this.scoreState.linesCleared += result.cleared;
    }

    const totalPoints = bonusPoints + linePoints;

    this.emit({ type: 'lock', positions: lockedPositions });

    if (result.cleared > 0) {
      this.emit({
        type: 'lineClear',
        count: result.cleared,
        rows: fullRows,
        points: linePoints,
        boardBeforeClear,
      });
    }

    if (totalPoints > 0) {
      this.applyScore(totalPoints);
    }

    if (this.phase === 'cleared' || this.phase === 'gameOver') return;

    this.spawnNextPiece();
  }

  getRenderCells() {
    const cells = this.board.map((row) => [...row]);

    if (this.activePiece) {
      const color = TETROMINO_COLORS[this.activePiece.type];
      for (const [row, col] of absolutePositions(this.activePiece)) {
        if (row >= 0 && row < cells.length && col >= 0 && col < cells[0].length) {
          cells[row][col] = color;
        }
      }
    }

    return cells;
  }
}
