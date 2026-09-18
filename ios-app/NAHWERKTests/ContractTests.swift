import XCTest
@testable import NAHWERK

final class ContractTests: XCTestCase {
    func testUIActionAllowlistAcceptsOnlyKnownNativeActions() {
        XCTAssertEqual(AllowedUIActionType.validated("SIGN_UP"), .signUp)
        XCTAssertEqual(AllowedUIActionType.validated(" sign_in "), .signIn)
        XCTAssertEqual(AllowedUIActionType.validated("CONNECT_EMAIL"), .connectEmail)
        XCTAssertNil(AllowedUIActionType.validated("OPEN_ARBITRARY_URL"))
        XCTAssertNil(AllowedUIActionType.validated("RUN_SCRIPT"))
    }

    func testCoreEnvelopeDropsUnknownActionsFromRenderableSet() {
        let safe = RawUIAction(id: "1", type: "SIGN_UP", label: "Kostenlos anmelden")
        let unsafe = RawUIAction(id: "2", type: "OPEN_URL", label: "Öffnen")
        let envelope = CoreEnvelope(
            conversationID: nil,
            responseState: "ANSWER",
            messages: [CoreTextMessage(type: "text", text: "Hallo", semanticRole: nil)],
            uiActions: [safe, unsafe]
        )

        XCTAssertEqual(envelope.customerText, "Hallo")
        XCTAssertEqual(envelope.allowedActions, [safe])
    }

    func testGuestResponseDecodesTokenAndApprovedNativeActions() throws {
        let data = """
        {
          "ok": true,
          "environment": "PROD",
          "authoritative": true,
          "guest_token": "guest-test-token",
          "core": {
            "response_state": "ANSWER",
            "messages": [
              { "type": "text", "text": "Hallo", "semantic_role": "CUSTOMER_VISIBLE" }
            ],
            "ui_actions": [
              { "id": "sign-in", "type": "SIGN_IN", "label": "Anmelden" },
              { "id": "unsafe", "type": "OPEN_URL", "label": "Öffnen" }
            ]
          }
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(AppChatResponse.self, from: data)
        XCTAssertEqual(response.environment, "PROD")
        XCTAssertEqual(response.guestToken, "guest-test-token")
        XCTAssertEqual(response.core?.customerText, "Hallo")
        XCTAssertEqual(response.core?.allowedActions.count, 1)
        XCTAssertEqual(response.core?.allowedActions.first?.allowedType, .signIn)
    }

    func testCanonicalCoinChecksumIsFrozen() {
        XCTAssertEqual(
            CanonicalCoinLoader.expectedSHA256,
            "40d81ef0f53c31a48cc9ca2ec2ca8dfca2ead41c897aa0c1a673ddac43a980a3"
        )
    }
}
