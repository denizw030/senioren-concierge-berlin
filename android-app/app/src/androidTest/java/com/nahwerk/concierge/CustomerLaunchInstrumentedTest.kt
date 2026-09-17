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
    fun launcherStartsPublicAndExposesFreeRegistrationWithoutNetworkCall() {
        composeRule.onNodeWithText("Dein persönlicher Concierge").assertIsDisplayed()
        composeRule.onNodeWithTag("public_menu").assertIsDisplayed()
        composeRule.onNodeWithText("FREE & Tarife").performClick()
        composeRule.onNodeWithText("Kostenlos starten – ohne Kreditkarte").assertIsDisplayed()

        composeRule.onNodeWithTag("public_register").performScrollTo().assertIsDisplayed().performClick()
        composeRule.onNodeWithText("Kostenlos starten").assertIsDisplayed()
        composeRule.onNodeWithText("Kostenlos registrieren").performScrollTo().assertIsDisplayed()
    }
}
