package com.nahwerk.concierge.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class BackendContractReadinessTest {
    @Test
    fun verifiedCustomerProductContractsAreActivated() {
        assertEquals(BackendContractCapability.values().size, BackendContractReadiness.gates.size)
        assertEquals(7, BackendContractReadiness.activatedCount)

        listOf(
            BackendContractCapability.REGISTRATION,
            BackendContractCapability.CUSTOMER_PROFILE,
            BackendContractCapability.PAYG,
            BackendContractCapability.PAYMENT_METHODS,
            BackendContractCapability.FAMILY_DISPLAY,
            BackendContractCapability.SAFETY_DISPLAY
        ).forEach { capability ->
            val gate = BackendContractReadiness.gateFor(capability)
            assertEquals(ClientContractActivation.PROD_READ_WRITE, gate.activation)
            assertTrue(gate.backendAuthorityAvailable)
            assertTrue(gate.maySubmitAuthorityBearingAction)
            assertFalse(gate.mayAssumeSuccess)
        }

        val usage = BackendContractReadiness.gateFor(BackendContractCapability.COSTS_USAGE)
        assertEquals(ClientContractActivation.PROD_READ_ONLY, usage.activation)
        assertTrue(usage.backendAuthorityAvailable)
        assertFalse(usage.maySubmitAuthorityBearingAction)
        assertFalse(usage.mayAssumeSuccess)
    }

    @Test
    fun unrelatedCoreContractsRemainBlocked() {
        listOf(
            BackendContractCapability.CONVERSATION_HISTORY,
            BackendContractCapability.TASK_EXECUTION_DETAILS,
            BackendContractCapability.APPROVAL_CONTINUATION,
            BackendContractCapability.AUDIO_INPUT,
            BackendContractCapability.FILE_IMAGE_UPLOAD
        ).forEach { capability ->
            val gate = BackendContractReadiness.gateFor(capability)
            assertEquals(ClientContractActivation.BLOCKED, gate.activation)
            assertFalse(gate.backendAuthorityAvailable)
            assertFalse(gate.mayAssumeSuccess)
            assertFalse(gate.maySubmitAuthorityBearingAction)
        }
    }

    @Test
    fun retryableNeverMeansSuccess() {
        BackendContractCapability.values().forEach { capability ->
            val gate = BackendContractReadiness.stateFor(capability, ClientContractUiState.RETRYABLE)
            assertEquals(ClientContractUiState.RETRYABLE, gate.uiState)
            assertFalse(gate.mayAssumeSuccess)
        }
    }

    @Test
    fun paygUnknownNeverMeansEnabledOrChargeable() {
        val gate = BackendContractReadiness.stateFor(
            BackendContractCapability.PAYG,
            ClientContractUiState.UNKNOWN
        )
        assertTrue(gate.backendAuthorityAvailable)
        assertFalse(gate.mayAssumeSuccess)
    }

    @Test
    fun safetyUnknownNeverMeansSafeOrResolved() {
        val gate = BackendContractReadiness.stateFor(
            BackendContractCapability.SAFETY_DISPLAY,
            ClientContractUiState.UNKNOWN
        )
        assertTrue(gate.backendAuthorityAvailable)
        assertFalse(gate.mayAssumeSuccess)
    }
}
