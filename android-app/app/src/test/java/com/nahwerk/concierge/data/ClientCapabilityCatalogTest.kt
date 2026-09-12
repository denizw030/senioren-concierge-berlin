package com.nahwerk.concierge.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ClientCapabilityCatalogTest {
    @Test
    fun customerLaunchSurfacesMatchVerifiedProdBindings() {
        assertEquals(ClientCapabilityKey.values().size, ClientCapabilityCatalog.all.size)
        assertEquals(ClientCapabilityCatalog.all.size, ClientCapabilityCatalog.all.map { it.key }.toSet().size)
        assertEquals(ClientCapabilityCatalog.all.size, ClientCapabilityCatalog.all.map { it.testTag }.toSet().size)

        val prodWrite = setOf(
            ClientCapabilityKey.REGISTRATION,
            ClientCapabilityKey.PERSONAL_DATA,
            ClientCapabilityKey.PAYG,
            ClientCapabilityKey.PAYMENT_METHODS,
            ClientCapabilityKey.SAFETY,
            ClientCapabilityKey.FAMILY
        )
        prodWrite.forEach { key ->
            val capability = ClientCapabilityCatalog.forKey(key)
            assertEquals(ClientSurfaceReadiness.PROD_BOUND, capability.readiness)
            assertTrue(capability.backendAuthorityAvailable)
            assertTrue(capability.productionReady)
            assertTrue(capability.maySubmitAuthorityBearingAction)
        }

        val usage = ClientCapabilityCatalog.forKey(ClientCapabilityKey.USAGE_LIMITS)
        assertEquals(ClientSurfaceReadiness.PROD_READ_ONLY, usage.readiness)
        assertTrue(usage.backendAuthorityAvailable)
        assertTrue(usage.productionReady)
        assertFalse(usage.maySubmitAuthorityBearingAction)

        val blocked = setOf(
            ClientCapabilityKey.BILLING_SUBSCRIPTION,
            ClientCapabilityKey.NOTIFICATIONS,
            ClientCapabilityKey.VOICE_HANDOFF,
            ClientCapabilityKey.WHATSAPP_CONTINUITY,
            ClientCapabilityKey.CONVERSATION_HISTORY,
            ClientCapabilityKey.TASK_STATE
        )
        blocked.forEach { key ->
            val capability = ClientCapabilityCatalog.forKey(key)
            assertEquals(ClientSurfaceReadiness.UI_READY_BACKEND_BLOCKED, capability.readiness)
            assertFalse(capability.backendAuthorityAvailable)
            assertFalse(capability.productionReady)
            assertFalse(capability.maySubmitAuthorityBearingAction)
        }
    }

    @Test
    fun catalogContainsAllRequestedClientSurfaces() {
        assertEquals(
            ClientCapabilityKey.values().toSet(),
            ClientCapabilityCatalog.all.map { it.key }.toSet()
        )
    }
}
