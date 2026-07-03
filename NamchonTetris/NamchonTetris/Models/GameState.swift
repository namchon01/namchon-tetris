import Foundation

enum GamePhase: Equatable {
    case ready
    case playing
    case paused
    case gameOver
}

struct ScoreState: Equatable {
    var score: Int = 0
    var level: Int = 1
    var linesCleared: Int = 0

    mutating func addLines(_ count: Int) {
        guard count > 0 else { return }

        let multiplier = level
        let points: Int
        switch count {
        case 1: points = 100
        case 2: points = 300
        case 3: points = 500
        case 4: points = 800
        default: points = 100 * count
        }

        score += points * multiplier
        linesCleared += count
        level = 1 + linesCleared / 10
    }

    mutating func addSoftDrop(points: Int) {
        score += points
    }

    mutating func addHardDrop(points: Int) {
        score += points
    }
}
