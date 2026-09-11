package com.nahwerk.concierge

import android.net.Uri
import androidx.compose.material3.MaterialTheme
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.nahwerk.concierge.data.ConciergeProfile
import com.nahwerk.concierge.data.HomeContext
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FinalClientUiInstrumentedTest {
    @get:Rule
    val composeRule = createComposeRule()

    private val home = HomeContext(
        greeting = "Was darf ich für dich tun?",
        concierge = ConciergeProfile("nilo", "Nilo", "cedar", ""),
        memoryCount = 2,
        openLoopCount = 1,
        reminders = emptyList()
    )

    @Test
    fun safeDeepLinksMapOnlyToKnownClientDestinations() {
        assertEquals(ClientDestination.CHAT, ClientDeepLinkParser.parse(Uri.parse("nahwerk://app/chat")))
        assertEquals(ClientDestination.SAFETY, ClientDeepLinkParser.parse(Uri.parse("nahwerk://app/safety")))
        assertEquals(ClientDestination.APP_STATUS, ClientDeepLinkParser.parse(Uri.parse("nahwerk://app/status")))
        assertNull(ClientDeepLinkParser.parse(Uri.parse("nahwerk://app/unknown")))
        assertNull(ClientDeepLinkParser.parse(Uri.parse("https://nahwerkconcierge.com/safety")))
        assertNull(ClientDeepLinkParser.parse(Uri.parse("nahwerk://other/chat")))
    }

    @Test
    fun accountHubExposesFinalClientSurfacesWithoutExecutingThem() {
        var opened: ClientDestination? = null
        composeRule.setContent {
            MaterialTheme {
                FinalAccountHubScreen(
                    home = home,
                    onBack = {},
                    onChat = {},
                    onReminders = {},
                    onOpen = { opened = it },
                    onLogout = {}
                )
            }
        }

        composeRule.onNodeWithTag("account_hub").assertIsDisplayed()
        composeRule.onNodeWithText("Persönliche Daten").assertIsDisplayed()
        composeRule.onNodeWithText("Nutzung & Limits").assertIsDisplayed()
        composeRule.onNodeWithText("Abo & Billing").assertIsDisplayed()
        composeRule.onNodeWithText("Safety").assertIsDisplayed().performClick()
        assertEquals(ClientDestination.SAFETY, opened)
    }

    @Test
    fun finalCapabilityCatalogScreenCanRenderEveryCapabilityWithoutAuthorityAction() {
        composeRule.setContent {
            MaterialTheme {
                FinalAccountHubScreen(
                    home = home,
                    onBack = {},
                    onChat = {},
                    onReminders = {},
                    onOpen = {},
                    onLogout = {}
                )
            }
        }

        composeRule.onNodeWithText("App- & Contract-Status").assertIsDisplayed()
    }
}
