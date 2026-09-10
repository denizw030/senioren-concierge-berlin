package com.nahwerk.concierge

import android.graphics.Bitmap
import android.os.SystemClock
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.nahwerk.concierge.data.ChatMessage
import com.nahwerk.concierge.data.ConciergeProfile
import com.nahwerk.concierge.data.HomeContext
import com.nahwerk.concierge.data.PendingChatRequest
import com.nahwerk.concierge.data.Reminder
import java.io.File
import java.io.FileOutputStream
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class VisualQaInstrumentedTest {
    @get:Rule
    val composeRule = createComposeRule()

    private val colors = darkColorScheme(
        primary = Color(0xFFD0AE68),
        onPrimary = Color(0xFF221A0C),
        background = Color(0xFF08090A),
        onBackground = Color(0xFFF5F2EC),
        surface = Color(0xFF121315),
        onSurface = Color(0xFFF5F2EC),
        surfaceVariant = Color(0xFF1A1B1E),
        onSurfaceVariant = Color(0xFFB9B6AF),
        error = Color(0xFFFFB4AB)
    )

    private val home = HomeContext(
        greeting = "Was darf ich für dich tun?",
        concierge = ConciergeProfile(
            id = "nilo",
            name = "Nilo",
            voice = "cedar",
            imageUrl = "https://raw.githubusercontent.com/denizw030/senioren-concierge-berlin/main/assets/concierges/large/nilo.webp"
        ),
        memoryCount = 12,
        openLoopCount = 2,
        reminders = listOf(
            Reminder("r1", "Arzttermin prüfen", "Morgen · 10:30", "offen"),
            Reminder("r2", "Paket abholen", "Freitag · 17:00", "geplant")
        )
    )

    private fun setFrame(width: Int = 390, height: Int = 820, fontScale: Float = 1f, content: @androidx.compose.runtime.Composable () -> Unit) {
        composeRule.setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(LocalDensity provides Density(density.density, fontScale)) {
                MaterialTheme(colorScheme = colors) {
                    Box(
                        Modifier.width(width.dp).height(height.dp).background(Color(0xFF08090A))
                    ) { content() }
                }
            }
        }
        composeRule.waitForIdle()
        SystemClock.sleep(1200)
    }

    private fun saveNode(name: String) {
        val bitmap = composeRule.onRoot().captureToImage().asAndroidBitmap()
        saveBitmap(name, bitmap)
    }

    private fun saveDevice(name: String) {
        composeRule.waitForIdle()
        SystemClock.sleep(700)
        saveBitmap(name, InstrumentationRegistry.getInstrumentation().uiAutomation.takeScreenshot())
    }

    private fun saveBitmap(name: String, bitmap: Bitmap) {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val directory = File(context.getExternalFilesDir(null), "visual-qa/before")
        check(directory.exists() || directory.mkdirs())
        FileOutputStream(File(directory, "$name.png")).use { stream ->
            check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream))
        }
    }

    @Test
    fun captureBeforeHome390() {
        setFrame {
            HomeScreen(home, false, null, {}, {}, {}, {})
        }
        saveNode("home-390")
    }

    @Test
    fun captureBeforeHome360() {
        setFrame(width = 360, height = 760) {
            HomeScreen(home, false, null, {}, {}, {}, {})
        }
        saveNode("home-360")
    }

    @Test
    fun captureBeforeChatEmpty() {
        setFrame {
            ChatScreen(home, emptyList(), "", false, null, null, {}, {}, {}, {}, {})
        }
        saveNode("chat-empty")
    }

    @Test
    fun captureBeforeChatHistoryAndLongMessage() {
        val longMessage = "Ich kümmere mich darum. Ich prüfe den bestehenden Vorgang und melde ausschließlich den bestätigten Stand zurück. Falls noch etwas fehlt, bleibt der Status offen und wird nicht als erledigt dargestellt."
        setFrame {
            ChatScreen(
                home,
                listOf(
                    ChatMessage("assistant", home.greeting),
                    ChatMessage("user", "Kannst du bitte meinen Termin morgen prüfen?", "source-visual-1"),
                    ChatMessage("assistant", longMessage)
                ),
                "Danke, und bitte auch die Adresse prüfen.",
                false,
                null,
                null,
                {}, {}, {}, {}, {}
            )
        }
        saveNode("chat-history-long")
    }

    @Test
    fun captureBeforePendingErrorRetry() {
        val pending = PendingChatRequest("source-visual-2", "corr-visual-2", "Bitte prüfe, ob die Reservierung bestätigt ist.", 1234L)
        setFrame {
            ChatScreen(
                home,
                listOf(ChatMessage("user", pending.message, pending.sourceMessageId)),
                "",
                false,
                "Keine bestätigte Antwort erhalten. Derselbe Request kann sicher erneut versucht werden.",
                pending,
                {}, {}, {}, {}, {}
            )
        }
        saveNode("chat-error-retry")
    }

    @Test
    fun captureBeforeSending() {
        val pending = PendingChatRequest("source-visual-3", "corr-visual-3", "Bitte erinnere mich morgen daran.", 1234L)
        setFrame {
            ChatScreen(
                home,
                listOf(ChatMessage("user", pending.message, pending.sourceMessageId)),
                "",
                true,
                null,
                pending,
                {}, {}, {}, {}, {}
            )
        }
        saveNode("chat-sending")
    }

    @Test
    fun captureBeforeAccount() {
        setFrame {
            SettingsScreen(home, {}, {})
        }
        saveNode("account")
    }

    @Test
    fun captureBeforeRemindersAndEmptyState() {
        setFrame {
            ReminderScreen(emptyList(), {})
        }
        saveNode("reminders-empty")
    }

    @Test
    fun captureBeforeLargeFont() {
        setFrame(width = 360, height = 760, fontScale = 1.35f) {
            ChatScreen(
                home,
                listOf(ChatMessage("assistant", "Ich bin dein persönlicher NAHWERK Concierge. Wie kann ich dir helfen?")),
                "Eine längere Nachricht mit großer Schrift",
                false,
                null,
                null,
                {}, {}, {}, {}, {}
            )
        }
        saveNode("chat-large-font-360")
    }

    @Test
    fun captureBeforeKeyboardOpen() {
        setFrame {
            ChatScreen(home, listOf(ChatMessage("assistant", home.greeting)), "", false, null, null, {}, {}, {}, {}, {})
        }
        composeRule.onNodeWithTag("chat_input").performClick().performTextInput("Tastatur-Test")
        saveDevice("chat-keyboard-open")
    }
}
