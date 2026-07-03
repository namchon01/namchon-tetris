import SwiftUI

struct GameOverView: View {
    let score: Int
    let onRestart: () -> Void

    var body: some View {
        ZStack {
            Color.black.opacity(0.7)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("GAME OVER")
                    .font(.largeTitle)
                    .fontWeight(.heavy)
                    .foregroundStyle(.white)

                Text("Score: \(score)")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.9))
                    .monospacedDigit()

                Button(action: onRestart) {
                    Text("PLAY AGAIN")
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundStyle(.black)
                        .padding(.horizontal, 32)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.white)
                        )
                }
                .buttonStyle(.plain)
            }
            .padding(32)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color(red: 0.15, green: 0.15, blue: 0.22))
            )
        }
    }
}
