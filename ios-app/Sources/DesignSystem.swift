import SwiftUI

enum NahwerkColors {
    static let background = Color(red: 0.027, green: 0.031, blue: 0.035)
    static let surface = Color(red: 0.055, green: 0.059, blue: 0.067)
    static let elevated = Color(red: 0.075, green: 0.078, blue: 0.086)
    static let divider = Color.white.opacity(0.10)
    static let primary = Color.white.opacity(0.94)
    static let secondary = Color.white.opacity(0.58)
    static let gold = Color(red: 0.79, green: 0.67, blue: 0.43)
    static let goldSoft = gold.opacity(0.14)
    static let error = Color(red: 0.95, green: 0.35, blue: 0.35)
}

struct NahwerkPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(NahwerkColors.gold.opacity(configuration.isPressed ? 0.78 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

extension View {
    func nahwerkCard() -> some View {
        self
            .padding(18)
            .background(NahwerkColors.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(NahwerkColors.divider, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}
