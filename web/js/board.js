import { BOARD_ROWS, BOARD_COLS } from './tetromino.js';
import { absolutePositions, TETROMINO_COLORS } from './tetromino.js';

export function createBoard() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

export function isInBounds(row, col) {
  return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
}

export function isValid(piece, board) {
  for (const [row, col] of absolutePositions(piece)) {
    if (col < 0 || col >= BOARD_COLS || row >= BOARD_ROWS) return false;
    if (row >= 0 && board[row][col]) return false;
  }
  return true;
}

export function placePiece(board, piece) {
  const next = board.map((row) => [...row]);
  const color = TETROMINO_COLORS[piece.type];

  for (const [row, col] of absolutePositions(piece)) {
    if (isInBounds(row, col)) {
      next[row][col] = color;
    }
  }

  return next;
}

export function clearLines(board) {
  const remaining = board.filter((row) => row.some((cell) => cell === null));
  const cleared = BOARD_ROWS - remaining.length;

  while (remaining.length < BOARD_ROWS) {
    remaining.unshift(Array(BOARD_COLS).fill(null));
  }

  return { board: remaining, cleared };
}
