import SwiftUI

struct BoardView: View {
    let board: Board
    let activePiece: ActivePiece?

    var body: some View {
        GeometryReader { geometry in
            let cellSize = min(
                geometry.size.width / CGFloat(Board.cols),
                geometry.size.height / CGFloat(Board.rows)
            )
            let boardWidth = cellSize * CGFloat(Board.cols)
            let boardHeight = cellSize * CGFloat(Board.rows)

            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color(red: 0.08, green: 0.08, blue: 0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color.white.opacity(0.15), lineWidth: 2)
                    )

                Canvas { context, _ in
                    drawGrid(context: &context, cellSize: cellSize)
                    drawPlacedBlocks(context: &context, cellSize: cellSize)
                    drawActivePiece(context: &context, cellSize: cellSize)
                }
                .frame(width: boardWidth, height: boardHeight)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(CGFloat(Board.cols) / CGFloat(Board.rows), contentMode: .fit)
    }

    private func drawGrid(context: inout GraphicsContext, cellSize: CGFloat) {
        for row in 0..<Board.rows {
            for col in 0..<Board.cols {
                let rect = CGRect(
                    x: CGFloat(col) * cellSize + 1,
                    y: CGFloat(row) * cellSize + 1,
                    width: cellSize - 2,
                    height: cellSize - 2
                )
                context.fill(
                    Path(roundedRect: rect, cornerRadius: 2),
                    with: .color(.white.opacity(0.03))
                )
            }
        }
    }

    private func drawPlacedBlocks(context: inout GraphicsContext, cellSize: CGFloat) {
        for row in 0..<Board.rows {
            for col in 0..<Board.cols {
                guard let cell = board.cell(at: row, col: col) else { continue }
                drawBlock(
                    context: &context,
                    row: row,
                    col: col,
                    color: cell.color,
                    cellSize: cellSize
                )
            }
        }
    }

    private func drawActivePiece(context: inout GraphicsContext, cellSize: CGFloat) {
        guard let piece = activePiece else { return }
        for (row, col) in piece.absolutePositions() {
            drawBlock(
                context: &context,
                row: row,
                col: col,
                color: piece.type.color,
                cellSize: cellSize,
                highlighted: true
            )
        }
    }

    private func drawBlock(
        context: inout GraphicsContext,
        row: Int,
        col: Int,
        color: Color,
        cellSize: CGFloat,
        highlighted: Bool = false
    ) {
        guard row >= 0 else { return }

        let rect = CGRect(
            x: CGFloat(col) * cellSize + 1,
            y: CGFloat(row) * cellSize + 1,
            width: cellSize - 2,
            height: cellSize - 2
        )

        context.fill(
            Path(roundedRect: rect, cornerRadius: 3),
            with: .color(color)
        )

        if highlighted {
            context.stroke(
                Path(roundedRect: rect, cornerRadius: 3),
                with: .color(.white.opacity(0.5)),
                lineWidth: 1
            )
        }
    }
}
