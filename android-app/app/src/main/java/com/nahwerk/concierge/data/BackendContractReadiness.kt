package com.nahwerk.concierge.data

/**
 * Fresh client-side view of the contracts verified against the active PROD runtime.
 * A capability is only marked live when the Android implementation consumes the
 * published server-owned contract; unknown responses still stay fail-closed.
 */
enum class BackendContractCapability {
    REGISTRATION,
    CUSTOMER_PROFILE,
    PAYG,
    PAYMENT_METHODS,
    COSTS_USAGE,
    CONVERSATION_HISTORY,
    TASK_EXECUTION_DETAILS,
    APPROVAL_CONTINUATION,
    AUDIO_INPUT,
    FILE_IMAGE_UPLOAD,
    FAMILY_DISPLAY,
    SAFETY_DISPLAY
}

enum class ClientContractUiState {
    LOADING,
    UNAVAILABLE,
    RETRYABLE,
    UNKNOWN
}

enum class ClientContractActivation {
    PROD_READ_WRITE,
    PROD_READ_ONLY,
    BLOCKED
}

data class ClientContractGate(
    val capability: BackendContractCapability,
    val activation: ClientContractActivation,
    val uiState: ClientContractUiState = ClientContractUiState.UNKNOWN
) {
    val backendAuthorityAvailable: Boolean = activation != ClientContractActivation.BLOCKED

    /** No client-side state, including UNKNOWN/RETRYABLE, is ever promoted to success. */
    val mayAssumeSuccess: Boolean = false

    /** Only a verified server-owned write contract may carry an explicit customer action. */
    val maySubmitAuthorityBearingAction: Boolean =
        activation == ClientContractActivation.PROD_READ_WRITE
}

object BackendContractReadiness {
    private val activations = mapOf(
        BackendContractCapability.REGISTRATION to ClientContractActivation.PROD_READ_WRITE,
        BackendContractCapability.CUSTOMER_PROFILE to ClientContractActivation.PROD_READ_WRITE,
        BackendContractCapability.PAYG to ClientContractActivation.PROD_READ_WRITE,
        BackendContractCapability.PAYMENT_METHODS to ClientContractActivation.PROD_READ_WRITE,
        BackendContractCapability.COSTS_USAGE to ClientContractActivation.PROD_READ_ONLY,
        BackendContractCapability.FAMILY_DISPLAY to ClientContractActivation.PROD_READ_WRITE,
        BackendContractCapability.SAFETY_DISPLAY to ClientContractActivation.PROD_READ_WRITE
    )

    val gates: List<ClientContractGate> = BackendContractCapability.values().map { capability ->
        ClientContractGate(
            capability = capability,
            activation = activations[capability] ?: ClientContractActivation.BLOCKED
        )
    }

    val activatedCount: Int = gates.count { it.activation != ClientContractActivation.BLOCKED }

    fun gateFor(capability: BackendContractCapability): ClientContractGate =
        gates.first { it.capability == capability }

    fun stateFor(
        capability: BackendContractCapability,
        uiState: ClientContractUiState
    ): ClientContractGate = gateFor(capability).copy(uiState = uiState)
}
