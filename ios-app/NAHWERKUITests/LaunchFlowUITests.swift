import XCTest

final class LaunchFlowUITests: XCTestCase {
    func testLaunchStartsInChatWithoutLoginWall() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["Wie kann ich dir helfen?"].waitForExistence(timeout: 4))
        XCTAssertTrue(app.textFields["guest_chat_input"].exists)
        XCTAssertTrue(app.buttons["top_login"].exists)
    }

    func testGuestComposerRemainsAvailableWhenGuestRuntimeIsNotYetCanonical() {
        let app = XCUIApplication()
        app.launch()

        let input = app.textFields["guest_chat_input"]
        XCTAssertTrue(input.waitForExistence(timeout: 4))
        input.tap()
        input.typeText("Was kannst du?")
        app.buttons["guest_chat_send"].tap()

        XCTAssertTrue(app.staticTexts["chat_error"].waitForExistence(timeout: 4))
        XCTAssertTrue(input.exists)
    }
}
