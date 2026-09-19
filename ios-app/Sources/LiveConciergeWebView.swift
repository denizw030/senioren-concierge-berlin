import SwiftUI
import WebKit

struct LiveConciergeWebView: UIViewRepresentable {
    let sessionToken: String
    let onClose: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(sessionToken: sessionToken, onClose: onClose)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.userContentController.add(context.coordinator, name: "nahwerkLiveClose")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false

        let url = URL(string: "https://nahwerkconcierge.com/app-live.html")!
        var request = URLRequest(url: url)
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.evaluateJavaScript("window.stopNahwerkAppLive?.()")
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "nahwerkLiveClose")
        webView.stopLoading()
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        private let sessionToken: String
        private let onClose: () -> Void
        private var started = false

        init(sessionToken: String, onClose: @escaping () -> Void) {
            self.sessionToken = sessionToken
            self.onClose = onClose
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard !started,
                  webView.url?.scheme == "https",
                  webView.url?.host == "nahwerkconcierge.com" else { return }
            started = true
            guard let data = try? JSONEncoder().encode(sessionToken),
                  let encoded = String(data: data, encoding: .utf8) else { return }
            webView.evaluateJavaScript("window.startNahwerkAppLive((encoded))")
        }

        @available(iOS 15.0, *)
        func webView(
            _ webView: WKWebView,
            requestMediaCapturePermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            type: WKMediaCaptureType,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            guard origin.protocol == "https",
                  origin.host == "nahwerkconcierge.com",
                  type == .microphone else {
                decisionHandler(.deny)
                return
            }
            decisionHandler(.grant)
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "nahwerkLiveClose" else { return }
            DispatchQueue.main.async { self.onClose() }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async { self.onClose() }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async { self.onClose() }
        }
    }
}
