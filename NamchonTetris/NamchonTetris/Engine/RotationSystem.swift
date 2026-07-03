import Foundation

enum RotationSystem {
    private static let wallKickOffsets = [(0, 0), (0, -1), (0, 1), (-1, 0), (1, 0), (0, -2), (0, 2)]

    static func rotatedPiece(
        _ piece: ActivePiece,
        on board: Board,
        clockwise: Bool = true
    ) -> ActivePiece? {
        let rotated = piece.rotated(clockwise: clockwise)

        for (dRow, dCol) in wallKickOffsets {
            let candidate = rotated.moved(byRow: dRow, byCol: dCol)
            if CollisionDetector.isValid(piece: candidate, on: board) {
                return candidate
            }
        }

        return nil
    }
}
