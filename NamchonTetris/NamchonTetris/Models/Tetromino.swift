import SwiftUI

enum TetrominoType: CaseIterable, Equatable {
    case I, O, T, S, Z, J, L

    var color: Color {
        switch self {
        case .I: return Color(red: 0.0, green: 0.85, blue: 0.95)
        case .O: return Color(red: 0.95, green: 0.85, blue: 0.0)
        case .T: return Color(red: 0.75, green: 0.0, blue: 0.85)
        case .S: return Color(red: 0.0, green: 0.85, blue: 0.2)
        case .Z: return Color(red: 0.95, green: 0.15, blue: 0.15)
        case .J: return Color(red: 0.0, green: 0.35, blue: 0.95)
        case .L: return Color(red: 0.95, green: 0.55, blue: 0.0)
        }
    }

    /// Block offsets relative to the piece origin (row, col).
    var baseOffsets: [(Int, Int)] {
        switch self {
        case .I: return [(0, 0), (0, 1), (0, 2), (0, 3)]
        case .O: return [(0, 0), (0, 1), (1, 0), (1, 1)]
        case .T: return [(0, 1), (1, 0), (1, 1), (1, 2)]
        case .S: return [(0, 1), (0, 2), (1, 0), (1, 1)]
        case .Z: return [(0, 0), (0, 1), (1, 1), (1, 2)]
        case .J: return [(0, 0), (1, 0), (1, 1), (1, 2)]
        case .L: return [(0, 2), (1, 0), (1, 1), (1, 2)]
        }
    }

    static func random() -> TetrominoType {
        allCases.randomElement()!
    }
}

struct ActivePiece: Equatable {
    var type: TetrominoType
    var row: Int
    var col: Int
    var rotation: Int

    var offsets: [(Int, Int)] {
        let base = type.baseOffsets
        guard type != .O else { return base }

        let centerRow = base.map(\.0).reduce(0, +) / base.count
        let centerCol = base.map(\.1).reduce(0, +) / base.count

        return base.map { (row, col) in
            let translatedRow = row - centerRow
            let translatedCol = col - centerCol
            let rotated = rotatePoint(row: translatedRow, col: translatedCol, times: rotation)
            return (rotated.row + centerRow, rotated.col + centerCol)
        }
    }

    func absolutePositions() -> [(Int, Int)] {
        offsets.map { (row + $0.0, col + $0.1) }
    }

    func moved(byRow dRow: Int, byCol dCol: Int) -> ActivePiece {
        var piece = self
        piece.row += dRow
        piece.col += dCol
        return piece
    }

    func rotated(clockwise: Bool = true) -> ActivePiece {
        var piece = self
        if clockwise {
            piece.rotation = (rotation + 1) % 4
        } else {
            piece.rotation = (rotation + 3) % 4
        }
        return piece
    }

    private func rotatePoint(row: Int, col: Int, times: Int) -> (row: Int, col: Int) {
        var r = row
        var c = col
        for _ in 0..<(times % 4) {
            let newRow = c
            let newCol = -r
            r = newRow
            c = newCol
        }
        return (r, c)
    }
}
