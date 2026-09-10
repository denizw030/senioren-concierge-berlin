package com.nahwerk.concierge

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.nahwerk.concierge.data.ChatMessage
import com.nahwerk.concierge.data.ConciergeProfile
import com.nahwerk.concierge.data.HomeContext
import com.nahwerk.concierge.data.PendingChatRequest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AppUiInstrumentedTest {
    @get:Rule
    val composeRule = createComposeRule()

    private val home = HomeContext(
        greeting = "Was darf ich für dich tun?",
        concierge = ConciergeProfile("nilo", "Nilo", "cedar", ""),
        memoryCount = 0,
        openLoopCount = 0,
        reminders = emptyList()
    )

    @Test
    fun loginFormAcceptsMaskedPasswordFlowAndSubmitsOnce() {
        var submittedEmail = ""
        var submittedPassword = ""
        var submitCount = 0
        composeRule.setContent {
            MaterialTheme {
                LoginScreen(
                    busy = false,
                    error = null,
                    notice = null,
                    onLogin = { email, password ->
                        submittedEmail = email
                        submittedPassword = password
                        submitCount += 1
                    },
                    onReset = {}
                )
            }
        }

        composeRule.onNodeWithTag("login_email").performTextInput("test@example.com")
        composeRule.onNodeWithTag("login_password").performTextInput("geheim123")
        composeRule.onNodeWithTag("login_submit").assertIsEnabled().performClick()

        assertEquals(1, submitCount)
        assertEquals("test@example.com", submittedEmail)
        assertEquals("geheim123", submittedPassword)
    }

    @Test
    fun sendButtonLocksImmediatelyAfterFirstSend() {
        var sendCount = 0
        composeRule.setContent {
            var sending by remember { mutableStateOf(false) }
            MaterialTheme {
                ChatScreen(
                    home = home,
                    messages = listOf(ChatMessage("assistant", home.greeting)),
                    draft = "Hallo",
                    sending = sending,
                    error = null,
                    pendingRequest = null,
                    onDraftChange = {},
                    onSend = {
                        sendCount += 1
                        sending = true
                    },
                    onRetry = {},
                    onDiscard = {},
                    onBack = {}
                )
            }
        }

        composeRule.onNodeWithTag("chat_send").assertIsEnabled().performClick()
        composeRule.waitForIdle()
        composeRule.onNodeWithTag("chat_send").assertIsNotEnabled()
        assertEquals(1, sendCount)
    }

    @Test
    fun unresolvedPendingRequestLocksNewComposerAndExposesSafeRetry() {
        val pending = PendingChatRequest("source-1", "corr-1", "Offene Nachricht", 1234L)
        composeRule.setContent {
            MaterialTheme {
                ChatScreen(
                    home = home,
                    messages = listOf(ChatMessage("user", pending.message, pending.sourceMessageId)),
                    draft = "",
                    sending = false,
                    error = "Nicht bestätigt",
                    pendingRequest = pending,
                    onDraftChange = {},
                    onSend = {},
                    onRetry = {},
                    onDiscard = {},
                    onBack = {}
                )
            }
        }

        composeRule.onNodeWithTag("pending_request").assertIsDisplayed()
        composeRule.onNodeWithTag("chat_input").assertIsNotEnabled()
        composeRule.onNodeWithTag("chat_send").assertIsNotEnabled()
        composeRule.onNodeWithTag("pending_retry").assertIsEnabled()
        composeRule.onNodeWithTag("error_message").assertIsDisplayed()
    }
}
