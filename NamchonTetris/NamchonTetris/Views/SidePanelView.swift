import SwiftUI

struct SidePanelView: View {
    let score: Int
    let level: Int
    let linesCleared: Int
    let nextPieceType: TetrominoType
    let phase: GamePhase
    let onTogglePause: () -> Void
    let onRestart: () -> Void
    let onMoveLeft: () -> Void
    let onMoveRight: () -> Void
    let onRotate: () -> Void
    let onSoftDrop: () -> Void
    let onHardDrop: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("TETRIS")
                        .font(.headline)
                        .fontWeight(.heavy)
                        .foregroundStyle(.white)

                    HStack(spacing: 16) {
                        StatRow(label: "SCORE", value: "\(score)")
                        StatRow(label: "LEVEL", value: "\(level)")
                        StatRow(label: "LINES", value: "\(linesCleared)")
                    }
                }

                Spacer()

                NextPieceView(type: nextPieceType)
            }

            ControlButtonsView(
                onMoveLeft: onMoveLeft,
                onMoveRight: onMoveRight,
                onRotate: onRotate,
                onSoftDrop: onSoftDrop,
                onHardDrop: onHardDrop
            )

            HStack(spacing: 12) {
                ActionButton(
                    title: phase == .paused ? "RESUME" : "PAUSE",
                    action: onTogglePause
                )
                ActionButton(title: "RESTART", action: onRestart)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(red: 0.12, green: 0.12, blue: 0.18))
    }
}

private struct StatRow: View {
    let label: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.5))
            Text(value)
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(.white)
                .monospacedDigit()
        }
    }
}

private struct ActionButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.white.opacity(0.15))
                )
        }
        .buttonStyle(.plain)
    }
}
