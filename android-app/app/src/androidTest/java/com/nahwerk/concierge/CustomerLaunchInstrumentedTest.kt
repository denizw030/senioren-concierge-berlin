package com.nahwerk.concierge

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CustomerLaunchInstrumentedTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<CustomerLaunchActivity>()

    @Test
    fun launcherStartsPublicChatBeforeLoginAndExposesAccountActionsWithoutNetworkCall() {
        composeRule.onNodeWithText("Wie kann ich dir helfen?").assertIsDisplayed()
        composeRule.onNodeWithTag("guest_chat_input").assertIsDisplayed()
        composeRule.onNodeWithTag("open_chat_drawer").assertIsDisplayed().performClick()
        composeRule.onNodeWithTag("guest_profile_menu").assertIsDisplayed().performClick()
        composeRule.onNodeWithText("Kostenlos registrieren").assertIsDisplayed().performClick()
        composeRule.onNodeWithText("Kostenlos starten").assertIsDisplayed()
        composeRule.onNodeWithText("Kostenlos registrieren").performScrollTo().assertIsDisplayed()
    }
}
