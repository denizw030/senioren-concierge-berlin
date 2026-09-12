package com.nahwerk.concierge

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CustomerLaunchInstrumentedTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<CustomerLaunchActivity>()

    @Test
    fun launcherExposesRegistrationWithoutCallingProd() {
        composeRule.onNodeWithTag("registration_open").assertIsDisplayed().performClick()
        composeRule.onNodeWithText("NAHWERK Konto erstellen").assertIsDisplayed()
        composeRule.onNodeWithText("Kostenlos registrieren").assertIsDisplayed()
    }
}
