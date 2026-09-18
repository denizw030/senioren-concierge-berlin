import CryptoKit
import SwiftUI
import UIKit

@main
struct NAHWERKApp: App {
    @StateObject private var session = SessionStore()

    var body: some Scene {
        WindowGroup {
            RootView(session: session)
                .preferredColorScheme(.dark)
                .tint(NahwerkDesign.gold)
        }
    }
}

@MainActor
private struct RootView: View {
    @ObservedObject var session: SessionStore
    @StateObject private var chat = ChatViewModel(api: .production)
    @State private var showSplash = true

    var body: some View {
        ZStack {
            ChatFirstView(model: chat, session: session)

            if showSplash {
                SplashView()
                    .transition(.opacity)
                    .zIndex(10)
            }
        }
        .background(NahwerkDesign.background.ignoresSafeArea())
        .task {
            if let token = session.validToken {
                let valid = (try? await NAHWERKAPI.production.checkSession(token: token)) == true
                if !valid {
                    session.clear()
                } else {
                    await chat.refreshHistory(token: token)
                }
            }

            try? await Task.sleep(for: .milliseconds(850))
            withAnimation(.easeOut(duration: 0.26)) {
                showSplash = false
            }
        }
    }
}

private struct SplashView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            CanonicalCoinView()
                .frame(width: 300, height: 300)
                .accessibilityHidden(true)
        }
    }
}

struct CanonicalCoinView: View {
    @State private var image: UIImage?

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                Color.clear
            }
        }
        .task {
            image = CanonicalCoinLoader.load()
        }
    }
}

enum CanonicalCoinLoader {
    static let expectedSHA256 = "40d81ef0f53c31a48cc9ca2ec2ca8dfca2ead41c897aa0c1a673ddac43a980a3"

    static func load(bundle: Bundle = .main) -> UIImage? {
        guard let url = bundle.url(forResource: "nahwerk_brand_coin", withExtension: "webp"),
              let data = try? Data(contentsOf: url) else {
            return nil
        }

        let digest = SHA256.hash(data: data)
            .map { String(format: "%02x", $0) }
            .joined()

        guard digest == expectedSHA256 else {
            return nil
        }
        return UIImage(data: data)
    }
}

enum NahwerkDesign {
    static let background = Color(red: 7 / 255, green: 8 / 255, blue: 9 / 255)
    static let surface = Color(red: 17 / 255, green: 18 / 255, blue: 20 / 255)
    static let elevated = Color(red: 25 / 255, green: 26 / 255, blue: 29 / 255)
    static let softSurface = Color(red: 34 / 255, green: 32 / 255, blue: 27 / 255)
    static let primaryText = Color(red: 245 / 255, green: 242 / 255, blue: 236 / 255)
    static let secondaryText = Color(red: 190 / 255, green: 187 / 255, blue: 180 / 255)
    static let gold = Color(red: 215 / 255, green: 182 / 255, blue: 108 / 255)
    static let goldSoft = Color(red: 58 / 255, green: 48 / 255, blue: 32 / 255)
    static let divider = Color(red: 48 / 255, green: 49 / 255, blue: 54 / 255)
    static let error = Color(red: 255 / 255, green: 180 / 255, blue: 171 / 255)

    static let touchHeight: CGFloat = 48
    static let primaryTouchHeight: CGFloat = 54
    static let cardRadius: CGFloat = 22
}
