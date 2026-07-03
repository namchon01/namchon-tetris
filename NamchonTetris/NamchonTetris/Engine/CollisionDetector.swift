import Foundation

enum CollisionDetector {
    static func isValid(piece: ActivePiece, on board: Board) -> Bool {
        for (row, col) in piece.absolutePositions() {
            if col < 0 || col >= Board.cols || row >= Board.rows {
                return false
            }
            if row >= 0, board.cell(at: row, col: col) != nil {
                return false
            }
        }
        return true
    }
}
