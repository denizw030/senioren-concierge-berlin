package com.nahwerk.concierge.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ClientCapabilityCatalogTest {
    @Test
    fun everyPreparedSurfaceRemainsNonAuthoritativeAndNonProduction() {
        assertEquals(ClientCapabilityKey.values().size, ClientCapabilityCatalog.all.size)
        assertEquals(ClientCapabilityCatalog.all.size, ClientCapabilityCatalog.all.map { it.key }.toSet().size)
        assertEquals(ClientCapabilityCatalog.all.size, ClientCapabilityCatalog.all.map { it.testTag }.toSet().size)

        ClientCapabilityCatalog.all.forEach { capability ->
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
