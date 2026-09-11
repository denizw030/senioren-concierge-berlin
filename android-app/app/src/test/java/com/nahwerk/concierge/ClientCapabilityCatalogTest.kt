package com.nahwerk.concierge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ClientCapabilityCatalogTest {
    @Test
    fun catalogCoversExactlyTheSeventeenFinalCapabilities() {
        assertEquals(17, ClientCapabilityCatalog.all.size)
        assertEquals(17, ClientCapabilityCatalog.all.map { it.id }.toSet().size)
        assertEquals(ClientCapabilityId.entries.toSet(), ClientCapabilityCatalog.all.map { it.id }.toSet())
    }

    @Test
    fun readyIsReservedForClientOwnedBehaviorOnly() {
        val ready = ClientCapabilityCatalog.all
            .filter { it.status == ClientCapabilityStatus.READY }
            .map { it.id }
            .toSet()

        assertEquals(
            setOf(
                ClientCapabilityId.ERROR_HANDLING,
                ClientCapabilityId.OFFLINE_RETRY,
                ClientCapabilityId.LOGOUT_SESSION_EXPIRY,
                ClientCapabilityId.DEEP_LINKS_NAVIGATION
            ),
            ready
        )
    }

    @Test
    fun authorityBearingCapabilitiesNeverClaimReady() {
        val authorityBearing = setOf(
            ClientCapabilityId.CONVERSATION_CONTINUITY,
            ClientCapabilityId.TASK_STATE,
            ClientCapabilityId.USAGE_LIMITS,
            ClientCapabilityId.PERSONAL_DATA,
            ClientCapabilityId.SAFETY,
            ClientCapabilityId.FAMILY,
            ClientCapabilityId.NOTIFICATIONS,
            ClientCapabilityId.VOICE_HANDOFF,
            ClientCapabilityId.WHATSAPP_CONTINUITY,
            ClientCapabilityId.BILLING_SUBSCRIPTION
        )

        assertFalse(ClientCapabilityCatalog.all.any { it.id in authorityBearing && it.status == ClientCapabilityStatus.READY })
    }

    @Test
    fun onlyConfirmedMobileTransportsAreNamed() {
        assertEquals("/login · /reset · /refresh", ClientCapabilityCatalog.byId(ClientCapabilityId.LOGIN_SESSION).endpoint)
        assertEquals("GET /mobile/me", ClientCapabilityCatalog.byId(ClientCapabilityId.ACCOUNT_CONTEXT).endpoint)
        assertEquals("POST /mobile/chat", ClientCapabilityCatalog.byId(ClientCapabilityId.CONCIERGE_CHAT).endpoint)

        ClientCapabilityCatalog.all
            .filter { it.id !in setOf(ClientCapabilityId.LOGIN_SESSION, ClientCapabilityId.ACCOUNT_CONTEXT, ClientCapabilityId.CONCIERGE_CHAT) }
            .forEach { capability ->
                assertTrue(capability.endpoint.isNotBlank())
                assertFalse(capability.endpoint.contains("/mobile/") && capability.status != ClientCapabilityStatus.READY)
            }
    }

    @Test
    fun blockedCapabilitiesDescribeFailClosedBehaviorAndRemainingWork() {
        ClientCapabilityCatalog.all
            .filter { it.status != ClientCapabilityStatus.READY && it.status != ClientCapabilityStatus.PARTIAL }
            .forEach { capability ->
                assertTrue("fail-closed missing for ${capability.id}", capability.failClosed.isNotBlank())
                assertTrue("remaining work missing for ${capability.id}", capability.remainingWork.isNotBlank())
                assertFalse("PROD must not be claimed ready for ${capability.id}", capability.prod.contains("bereit", ignoreCase = true))
            }
    }
}
