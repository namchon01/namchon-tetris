export const BOARD_ROWS = 20;
export const BOARD_COLS = 10;

export const TETROMINO_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export const TETROMINO_COLORS = {
  I: '#00d9f2',
  O: '#f2d900',
  T: '#bf00d9',
  S: '#00d933',
  Z: '#f22626',
  J: '#0059f2',
  L: '#f28c00',
};

export const BASE_OFFSETS = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]],
  O: [[0, 0], [0, 1], [1, 0], [1, 1]],
  T: [[0, 1], [1, 0], [1, 1], [1, 2]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]],
  Z: [[0, 0], [0, 1], [1, 1], [1, 2]],
  J: [[0, 0], [1, 0], [1, 1], [1, 2]],
  L: [[0, 2], [1, 0], [1, 1], [1, 2]],
};

export function randomType() {
  return TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
}

function rotatePoint(row, col, times) {
  let r = row;
  let c = col;
  for (let i = 0; i < times % 4; i += 1) {
    const newRow = c;
    const newCol = -r;
    r = newRow;
    c = newCol;
  }
  return { row: r, col: c };
}

export function getOffsets(type, rotation) {
  const base = BASE_OFFSETS[type];
  if (type === 'O') return base;

  const centerRow = Math.floor(base.reduce((sum, [r]) => sum + r, 0) / base.length);
  const centerCol = Math.floor(base.reduce((sum, [, c]) => sum + c, 0) / base.length);

  return base.map(([row, col]) => {
    const translatedRow = row - centerRow;
    const translatedCol = col - centerCol;
    const rotated = rotatePoint(translatedRow, translatedCol, rotation);
    return [rotated.row + centerRow, rotated.col + centerCol];
  });
}

export function createPiece(type, row = 0, col = BOARD_COLS / 2 - 2, rotation = 0) {
  return { type, row, col, rotation };
}

export function movePiece(piece, dRow, dCol) {
  return { ...piece, row: piece.row + dRow, col: piece.col + dCol };
}

export function rotatePiece(piece, clockwise = true) {
  return {
    ...piece,
    rotation: clockwise ? (piece.rotation + 1) % 4 : (piece.rotation + 3) % 4,
  };
}

export function absolutePositions(piece) {
  return getOffsets(piece.type, piece.rotation).map(([r, c]) => [piece.row + r, piece.col + c]);
}
