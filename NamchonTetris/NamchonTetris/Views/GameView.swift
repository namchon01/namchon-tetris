import SwiftUI

struct GameView: View {
    @State private var viewModel = GameViewModel()

    var body: some View {
        ZStack {
            Color(red: 0.06, green: 0.06, blue: 0.1)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                BoardView(
                    board: viewModel.board,
                    activePiece: viewModel.activePiece
                )
                .frame(maxHeight: .infinity)
                .layoutPriority(1)
                .padding(.horizontal, 16)
                .padding(.top, 8)

                SidePanelView(
                    score: viewModel.score,
                    level: viewModel.level,
                    linesCleared: viewModel.linesCleared,
                    nextPieceType: viewModel.nextPieceType,
                    phase: viewModel.phase,
                    onTogglePause: { viewModel.togglePause() },
                    onRestart: { viewModel.startGame() },
                    onMoveLeft: { viewModel.moveLeft() },
                    onMoveRight: { viewModel.moveRight() },
                    onRotate: { viewModel.rotate() },
                    onSoftDrop: { viewModel.softDrop() },
                    onHardDrop: { viewModel.hardDrop() }
                )
            }

            if viewModel.phase == .paused {
                pauseOverlay
            }

            if viewModel.phase == .gameOver {
                GameOverView(score: viewModel.score) {
                    viewModel.startGame()
                }
            }
        }
    }

    private var pauseOverlay: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()

            Text("PAUSED")
                .font(.largeTitle)
                .fontWeight(.heavy)
                .foregroundStyle(.white)
        }
    }
}

#Preview {
    GameView()
}
