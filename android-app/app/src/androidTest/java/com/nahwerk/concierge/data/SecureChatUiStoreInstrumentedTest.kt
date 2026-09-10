package com.nahwerk.concierge.data

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class SecureChatUiStoreInstrumentedTest {
    @Test
    fun encryptedChatUiStateRestoresOnlyForOwningAccount() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val store = SecureChatUiStore(context)
        store.clear()
        try {
            val messages = listOf(
                ChatMessage("assistant", "Hallo"),
                ChatMessage("user", "Bitte erledige das", "source-123")
            )
            assertTrue(store.save("account-a", messages, "Entwurf"))

            val restored = SecureChatUiStore(context).restore("account-a")
            assertEquals(messages, restored.messages)
            assertEquals("Entwurf", restored.draft)

            val foreign = SecureChatUiStore(context).restore("account-b")
            assertTrue(foreign.messages.isEmpty())
            assertTrue(foreign.draft.isEmpty())
        } finally {
            store.clear()
        }
    }
}
