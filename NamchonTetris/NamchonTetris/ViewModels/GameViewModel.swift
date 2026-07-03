import Foundation
import Observation

@MainActor
@Observable
final class GameViewModel {
    private let engine = GameEngine()
    private var dropTask: Task<Void, Never>?

    private(set) var board = Board()
    private(set) var activePiece: ActivePiece?
    private(set) var nextPieceType = TetrominoType.I
    private(set) var phase: GamePhase = .ready
    private(set) var score = 0
    private(set) var level = 1
    private(set) var linesCleared = 0

    init() {
        startGame()
    }

    deinit {
        dropTask?.cancel()
    }

    func startGame() {
        dropTask?.cancel()
        engine.start()
        syncFromEngine()
        startDropLoop()
    }

    func togglePause() {
        engine.togglePause()
        syncFromEngine()
        if engine.phase == .playing {
            startDropLoop()
        } else {
            dropTask?.cancel()
        }
    }

    func moveLeft() {
        guard engine.phase == .playing else { return }
        _ = engine.moveLeft()
        syncFromEngine()
    }

    func moveRight() {
        guard engine.phase == .playing else { return }
        _ = engine.moveRight()
        syncFromEngine()
    }

    func softDrop() {
        guard engine.phase == .playing else { return }
        _ = engine.moveDown()
        syncFromEngine()
    }

    func rotate() {
        guard engine.phase == .playing else { return }
        _ = engine.rotate()
        syncFromEngine()
    }

    func hardDrop() {
        guard engine.phase == .playing else { return }
        engine.hardDrop()
        syncFromEngine()
    }

    private func syncFromEngine() {
        board = engine.board
        activePiece = engine.activePiece
        nextPieceType = engine.nextPieceType
        phase = engine.phase
        score = engine.scoreState.score
        level = engine.scoreState.level
        linesCleared = engine.scoreState.linesCleared
    }

    private func startDropLoop() {
        dropTask?.cancel()
        dropTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                let interval = self.engine.dropInterval
                try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
                guard !Task.isCancelled else { return }
                self.engine.tick()
                self.syncFromEngine()
            }
        }
    }
}
