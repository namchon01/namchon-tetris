import Foundation

@MainActor
final class GameEngine {
    private(set) var board = Board()
    private(set) var activePiece: ActivePiece?
    private(set) var nextPieceType = TetrominoType.random()
    private(set) var phase: GamePhase = .ready
    private(set) var scoreState = ScoreState()

    /// Base gravity interval in seconds.
    private static let baseDropInterval: TimeInterval = 1.0
    /// Each level is 20% faster than the previous (interval × 0.8).
    private static let levelSpeedFactor = 0.8

    var dropInterval: TimeInterval {
        let level = max(1, scoreState.level)
        return max(
            0.08,
            Self.baseDropInterval * pow(Self.levelSpeedFactor, Double(level - 1))
        )
    }

    func start() {
        board = Board()
        scoreState = ScoreState()
        phase = .playing
        spawnNextPiece()
    }

    func pause() {
        guard phase == .playing else { return }
        phase = .paused
    }

    func resume() {
        guard phase == .paused else { return }
        phase = .playing
    }

    func togglePause() {
        switch phase {
        case .playing: pause()
        case .paused: resume()
        default: break
        }
    }

    func moveLeft() -> Bool {
        performMove { $0.moved(byRow: 0, byCol: -1) }
    }

    func moveRight() -> Bool {
        performMove { $0.moved(byRow: 0, byCol: 1) }
    }

    func moveDown() -> Bool {
        guard let piece = activePiece else { return false }
        let moved = piece.moved(byRow: 1, byCol: 0)

        if CollisionDetector.isValid(piece: moved, on: board) {
            activePiece = moved
            scoreState.addSoftDrop(points: 1)
            return true
        }

        lockPiece()
        return false
    }

    func rotate() -> Bool {
        guard let piece = activePiece,
              let rotated = RotationSystem.rotatedPiece(piece, on: board) else {
            return false
        }
        activePiece = rotated
        return true
    }

    func hardDrop() {
        guard var piece = activePiece else { return }

        var droppedRows = 0
        while true {
            let moved = piece.moved(byRow: 1, byCol: 0)
            if CollisionDetector.isValid(piece: moved, on: board) {
                piece = moved
                droppedRows += 1
            } else {
                break
            }
        }

        activePiece = piece
        scoreState.addHardDrop(points: droppedRows * 2)
        lockPiece()
    }

    func tick() {
        guard phase == .playing else { return }
        _ = moveDown()
    }

    private func performMove(_ transform: (ActivePiece) -> ActivePiece) -> Bool {
        guard let piece = activePiece else { return false }
        let moved = transform(piece)
        guard CollisionDetector.isValid(piece: moved, on: board) else { return false }
        activePiece = moved
        return true
    }

    private func spawnNextPiece() {
        let type = nextPieceType
        nextPieceType = TetrominoType.random()

        let spawnCol = Board.cols / 2 - 2
        let piece = ActivePiece(type: type, row: 0, col: spawnCol, rotation: 0)

        if CollisionDetector.isValid(piece: piece, on: board) {
            activePiece = piece
        } else {
            activePiece = nil
            phase = .gameOver
        }
    }

    private func lockPiece() {
        guard let piece = activePiece else { return }

        board.place(piece: piece)
        let cleared = board.clearLines()
        scoreState.addLines(cleared)
        spawnNextPiece()
    }
}
