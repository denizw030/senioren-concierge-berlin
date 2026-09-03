package com.nahwerk.concierge.data

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.SocketPolicy
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class PendingChatRetryInstrumentedTest {
    @Test
    fun pendingRequestSurvivesFailureAndReinstantiationWithIdenticalWireIds() = runBlocking {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val sessions = SecureSessionStore(context)
        val pending = PendingChatStore(context)
        sessions.clear()
        pending.clearAll()
        sessions.save("fixture-access", "fixture-refresh", 3600)

        val server = MockWebServer()
        server.start()

        try {
            val baseUrl = server.url("/").toString().removeSuffix("/")
            val api = NahwerkApi(
                sessions = sessions,
                pendingChats = pending,
                authBaseUrl = baseUrl + "/auth",
                gatewayBaseUrl = baseUrl
            )

            val created = api.createChatRequest("  Fixture Retry Nachricht  ")
            val persistedBeforeNetwork = PendingChatStore(context).current()
            assertNotNull(persistedBeforeNetwork)
            assertEquals(created.sourceMessageId, persistedBeforeNetwork!!.sourceMessageId)
            assertEquals(created.correlationId, persistedBeforeNetwork.correlationId)
            assertEquals("Fixture Retry Nachricht", persistedBeforeNetwork.message)

            server.enqueue(
                MockResponse().setSocketPolicy(SocketPolicy.DISCONNECT_AFTER_REQUEST)
            )

            val firstResult = api.sendText(created)
            assertFalse(firstResult.ok)
            assertEquals(created.sourceMessageId, firstResult.sourceMessageId)

            val firstWire = server.takeRequest(5, TimeUnit.SECONDS)
            assertNotNull(firstWire)

            val restoredStore = PendingChatStore(context)
            val restoredSessions = SecureSessionStore(context)
            val restored = restoredStore.current()
            assertNotNull(restored)
            assertEquals(created.sourceMessageId, restored!!.sourceMessageId)
            assertEquals(created.correlationId, restored.correlationId)
            assertEquals(created.message, restored.message)

            val apiAfterReinstantiation = NahwerkApi(
                sessions = restoredSessions,
                pendingChats = restoredStore,
                authBaseUrl = baseUrl + "/auth",
                gatewayBaseUrl = baseUrl
            )

            server.enqueue(
                MockResponse()
                    .setResponseCode(200)
                    .setHeader("Content-Type", "application/json")
                    .setBody(
                        """
                        {
                          "ok": true,
                          "reply": "Fixture erfolgreich",
                          "result": {"intent": "normal"},
                          "shadow_core": {
                            "duplicate": true,
                            "idempotency_verified": true
                          }
                        }
                        """.trimIndent()
                    )
            )

            val retryResult = apiAfterReinstantiation.sendText(restored)
            assertTrue(retryResult.ok)
            assertEquals("Fixture erfolgreich", retryResult.text)
            assertEquals(true, retryResult.shadowDuplicate)
            assertEquals(true, retryResult.idempotencyVerified)

            val retryWire = server.takeRequest(5, TimeUnit.SECONDS)
            assertNotNull(retryWire)

            assertEquals(created.sourceMessageId, firstWire!!.getHeader("Idempotency-Key"))
            assertEquals(created.sourceMessageId, retryWire!!.getHeader("Idempotency-Key"))
            assertEquals(created.sourceMessageId, firstWire.getHeader("X-Client-Request-Id"))
            assertEquals(created.sourceMessageId, retryWire.getHeader("X-Client-Request-Id"))

            val firstBody = JSONObject(firstWire.body.readUtf8())
            val retryBody = JSONObject(retryWire.body.readUtf8())

            assertEquals(created.message, firstBody.getString("message"))
            assertEquals(created.message, retryBody.getString("message"))
            assertEquals(created.sourceMessageId, firstBody.getString("source_message_id"))
            assertEquals(created.sourceMessageId, retryBody.getString("source_message_id"))
            assertEquals(created.correlationId, firstBody.getString("correlation_id"))
            assertEquals(created.correlationId, retryBody.getString("correlation_id"))

            assertNull(PendingChatStore(context).current())
        } finally {
            pending.clearAll()
            sessions.clear()
            server.shutdown()
        }
    }
    @Test
    fun liveGatewayIngressUsesClientStableIds() = runBlocking {
        val args = InstrumentationRegistry.getArguments()
        assumeTrue(args.getString("live_gateway") == "1")

        val accessToken = args.getString("live_access_token").orEmpty()
        assertTrue(accessToken.length > 20)

        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val sessions = SecureSessionStore(context)
        val pending = PendingChatStore(context)
        sessions.clear()
        pending.clearAll()

        try {
            sessions.save(
                accessToken = accessToken,
                refreshToken = "unused-live-e2e-refresh-token",
                expiresInSeconds = 3000
            )

            val api = NahwerkApi(
                sessions = sessions,
                pendingChats = pending
            )

            val request = api.createChatRequest(
                "Wie viel ist zwei plus zwei? Antworte kurz."
            )

            val result = api.sendText(request)

            assertTrue(result.ok)
            assertEquals(request.sourceMessageId, result.sourceMessageId)
            assertEquals(true, result.idempotencyVerified)
            assertEquals(false, result.shadowDuplicate)
            assertTrue(!result.text.isNullOrBlank())
            assertNull(PendingChatStore(context).current())

            println("NW_LIVE_APP_E2E_OK")
        } finally {
            pending.clearAll()
            sessions.clear()
        }
    }
}
