import Foundation

struct Board {
    static let rows = 20
    static let cols = 10

    private(set) var grid: [[Cell?]]

    init() {
        grid = Array(repeating: Array(repeating: nil, count: Board.cols), count: Board.rows)
    }

    func cell(at row: Int, col: Int) -> Cell? {
        guard isInBounds(row: row, col: col) else { return nil }
        return grid[row][col]
    }

    func isInBounds(row: Int, col: Int) -> Bool {
        row >= 0 && row < Board.rows && col >= 0 && col < Board.cols
    }

    mutating func place(piece: ActivePiece) {
        let cell = Cell(color: piece.type.color)
        for (row, col) in piece.absolutePositions() where isInBounds(row: row, col: col) {
            grid[row][col] = cell
        }
    }

    mutating func clearLines() -> Int {
        var cleared = 0
        var newGrid: [[Cell?]] = []

        for row in 0..<Board.rows {
            if grid[row].allSatisfy({ $0 != nil }) {
                cleared += 1
            } else {
                newGrid.append(grid[row])
            }
        }

        while newGrid.count < Board.rows {
            newGrid.insert(Array(repeating: nil, count: Board.cols), at: 0)
        }

        grid = newGrid
        return cleared
    }
}
