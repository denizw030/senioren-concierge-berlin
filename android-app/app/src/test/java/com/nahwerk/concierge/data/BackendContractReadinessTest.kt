package com.nahwerk.concierge.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class BackendContractReadinessTest {
    @Test
    fun allSevenMappedCapabilitiesExistAndRemainBlocked() {
        assertEquals(7, BackendContractReadiness.gates.size)
        assertEquals(0, BackendContractReadiness.activatedCount)
        assertEquals(
            BackendContractCapability.values().toSet(),
            BackendContractReadiness.gates.map { it.capability }.toSet()
        )
        BackendContractReadiness.gates.forEach { gate ->
            assertEquals(ClientContractActivation.BLOCKED, gate.activation)
            assertEquals(ClientContractUiState.UNKNOWN, gate.uiState)
            assertFalse(gate.backendAuthorityAvailable)
            assertFalse(gate.mayAssumeSuccess)
            assertFalse(gate.maySubmitAuthorityBearingAction)
        }
    }

    @Test
    fun everyPreparedUiStateRemainsFailClosed() {
        BackendContractCapability.values().forEach { capability ->
            ClientContractUiState.values().forEach { uiState ->
                val gate = BackendContractReadiness.stateFor(capability, uiState)

                assertEquals(ClientContractActivation.BLOCKED, gate.activation)
                assertEquals(uiState, gate.uiState)
                assertFalse(gate.backendAuthorityAvailable)
                assertFalse(gate.mayAssumeSuccess)
                assertFalse(gate.maySubmitAuthorityBearingAction)
            }
        }
    }

    @Test
    fun retryableNeverMeansSuccessOrPermission() {
        val gate = BackendContractReadiness.stateFor(
            BackendContractCapability.APPROVAL_CONTINUATION,
            ClientContractUiState.RETRYABLE
        )

        assertFalse(gate.backendAuthorityAvailable)
        assertFalse(gate.mayAssumeSuccess)
        assertFalse(gate.maySubmitAuthorityBearingAction)
    }

    @Test
    fun safetyUnknownNeverMeansSafeOrResolved() {
        val gate = BackendContractReadiness.stateFor(
            BackendContractCapability.SAFETY_DISPLAY,
            ClientContractUiState.UNKNOWN
        )

        assertFalse(gate.backendAuthorityAvailable)
        assertFalse(gate.mayAssumeSuccess)
        assertFalse(gate.maySubmitAuthorityBearingAction)
    }
}
