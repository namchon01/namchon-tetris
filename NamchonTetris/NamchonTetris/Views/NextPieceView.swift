import SwiftUI

struct NextPieceView: View {
    let type: TetrominoType

    var body: some View {
        VStack(spacing: 8) {
            Text("NEXT")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(.white.opacity(0.6))

            ZStack {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color.white.opacity(0.05))
                    .frame(width: 64, height: 64)

                Canvas { context, size in
                    let offsets = type.baseOffsets
                    let minRow = offsets.map(\.0).min() ?? 0
                    let maxRow = offsets.map(\.0).max() ?? 0
                    let minCol = offsets.map(\.1).min() ?? 0
                    let maxCol = offsets.map(\.1).max() ?? 0

                    let pieceRows = maxRow - minRow + 1
                    let pieceCols = maxCol - minCol + 1
                    let cellSize = min(
                        (size.width - 16) / CGFloat(pieceCols),
                        (size.height - 16) / CGFloat(pieceRows)
                    )

                    let offsetX = (size.width - CGFloat(pieceCols) * cellSize) / 2
                    let offsetY = (size.height - CGFloat(pieceRows) * cellSize) / 2

                    for (row, col) in offsets {
                        let rect = CGRect(
                            x: offsetX + CGFloat(col - minCol) * cellSize + 1,
                            y: offsetY + CGFloat(row - minRow) * cellSize + 1,
                            width: cellSize - 2,
                            height: cellSize - 2
                        )
                        context.fill(
                            Path(roundedRect: rect, cornerRadius: 2),
                            with: .color(type.color)
                        )
                    }
                }
                .frame(width: 64, height: 64)
            }
        }
    }
}
