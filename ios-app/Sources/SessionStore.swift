import Foundation
import Security

@MainActor
final class SessionStore: ObservableObject {
    @Published private(set) var sessionToken: String?
    @Published var pendingMfaToken: String?
    @Published var pendingMfaMethod: String?
    @Published var pendingMfaMethods: [String] = []
    @Published var pendingChallengeId: String?
    @Published var maskedPhone: String?

    private let keychainService = "com.nahwerk.concierge.product-session"
    private let keychainAccount = "session-token"

    init() {
        sessionToken = readKeychain()
    }

    var authenticated: Bool { !(sessionToken ?? "").isEmpty }
    var mfaRequired: Bool { !(pendingMfaToken ?? "").isEmpty }

    func saveSession(_ token: String) {
        guard !token.isEmpty else { return }
        writeKeychain(token)
        sessionToken = token
        clearPendingMfa()
    }

    func savePendingMfa(token: String, method: String?, methods: [String], challengeId: String?, maskedPhone: String?) {
        pendingMfaToken = token
        pendingMfaMethod = method ?? "choice"
        pendingMfaMethods = methods
        pendingChallengeId = challengeId
        self.maskedPhone = maskedPhone
    }

    func updatePending(method: String, challengeId: String?, maskedPhone: String?) {
        pendingMfaMethod = method
        pendingChallengeId = challengeId
        self.maskedPhone = maskedPhone
    }

    func clear() {
        SecItemDelete([
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: keychainAccount
        ] as CFDictionary)
        sessionToken = nil
        clearPendingMfa()
    }

    private func clearPendingMfa() {
        pendingMfaToken = nil
        pendingMfaMethod = nil
        pendingMfaMethods = []
        pendingChallengeId = nil
        maskedPhone = nil
    }

    private func writeKeychain(_ token: String) {
        let data = Data(token.utf8)
        SecItemDelete([
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: keychainAccount
        ] as CFDictionary)
        SecItemAdd([
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: keychainAccount,
            kSecValueData: data,
            kSecAttrAccessible: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ] as CFDictionary, nil)
    }

    private func readKeychain() -> String? {
        var result: CFTypeRef?
        let status = SecItemCopyMatching([
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: keychainService,
            kSecAttrAccount: keychainAccount,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ] as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8),
              !token.isEmpty else { return nil }
        return token
    }
}
