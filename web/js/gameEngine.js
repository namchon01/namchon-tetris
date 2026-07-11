import { createBoard, isValid, placePiece, clearLines } from './board.js';
import {
  createPiece,
  movePiece,
  rotatePiece,
  randomType,
  absolutePositions,
  TETROMINO_COLORS,
} from './tetromino.js';

const WALL_KICK_OFFSETS = [
  [0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [0, -2], [0, 2],
];

function createScoreState() {
  return { score: 0, level: 1, linesCleared: 0 };
}

function addLines(scoreState, count) {
  if (count <= 0) return 0;

  const pointsByCount = { 1: 100, 2: 300, 3: 500, 4: 800 };
  const points = (pointsByCount[count] ?? 100 * count) * scoreState.level;

  scoreState.score += points;
  scoreState.linesCleared += count;
  scoreState.level = 1 + Math.floor(scoreState.linesCleared / 10);
  return points;
}

export class GameEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = createBoard();
    this.activePiece = null;
    this.nextPieceType = randomType();
    this.phase = 'playing';
    this.scoreState = createScoreState();
    this.events = [];
    this.spawnNextPiece();
  }

  get dropInterval() {
    const base = 1000;
    const reduction = (this.scoreState.level - 1) * 80;
    return Math.max(80, base - reduction);
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
      this.scoreState.score += 1;
      if (soft) this.emit({ type: 'softDrop' });
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
    this.scoreState.score += droppedRows * 2;
    this.emit({ type: 'hardDrop', rows: droppedRows });
    this.lockPiece();
  }

  tick() {
    if (this.phase !== 'playing') return;
    this.moveDown();
  }

  spawnNextPiece() {
    const type = this.nextPieceType;
    this.nextPieceType = randomType();

    const piece = createPiece(type, 0, 3, 0);
    if (isValid(piece, this.board)) {
      this.activePiece = piece;
    } else {
      this.activePiece = null;
      this.phase = 'gameOver';
      this.emit({ type: 'gameOver' });
    }
  }

  lockPiece() {
    if (!this.activePiece) return;

    const lockedPositions = absolutePositions(this.activePiece);
    this.board = placePiece(this.board, this.activePiece);

    const fullRows = [];
    this.board.forEach((row, index) => {
      if (row.every((cell) => cell !== null)) fullRows.push(index);
    });
    const boardBeforeClear = this.board.map((row) => [...row]);

    const result = clearLines(this.board);
    this.board = result.board;

    const levelBefore = this.scoreState.level;
    const points = addLines(this.scoreState, result.cleared);

    this.emit({ type: 'lock', positions: lockedPositions });

    if (result.cleared > 0) {
      this.emit({
        type: 'lineClear',
        count: result.cleared,
        rows: fullRows,
        points,
        boardBeforeClear,
      });
    }

    if (this.scoreState.level > levelBefore) {
      this.emit({ type: 'levelUp', level: this.scoreState.level });
    }

    this.spawnNextPiece();
  }

  getGhostPositions() {
    if (!this.activePiece) return [];

    let piece = this.activePiece;
    while (true) {
      const moved = movePiece(piece, 1, 0);
      if (!isValid(moved, this.board)) break;
      piece = moved;
    }

    if (piece === this.activePiece) return [];
    return absolutePositions(piece);
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
