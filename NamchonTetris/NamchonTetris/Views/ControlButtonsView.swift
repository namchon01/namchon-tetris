import SwiftUI

struct ControlButtonsView: View {
    let onMoveLeft: () -> Void
    let onMoveRight: () -> Void
    let onRotate: () -> Void
    let onSoftDrop: () -> Void
    let onHardDrop: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                ControlButton(title: "◀", action: onMoveLeft)
                ControlButton(title: "▶", action: onMoveRight)
                ControlButton(title: "↻", action: onRotate)
            }

            HStack(spacing: 12) {
                ControlButton(title: "↓", action: onSoftDrop)
                ControlButton(title: "DROP", fontSize: 14, action: onHardDrop)
            }
        }
    }
}

private struct ControlButton: View {
    let title: String
    var fontSize: CGFloat = 20
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: fontSize, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white.opacity(0.12))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white.opacity(0.2), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}
