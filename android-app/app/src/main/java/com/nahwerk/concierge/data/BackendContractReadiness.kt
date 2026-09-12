package com.nahwerk.concierge.data

/**
 * Client-only readiness model for backend capabilities whose exact transport/schema contracts
 * are not activated yet. This file intentionally contains no endpoint, payload, identifier,
 * task, approval, billing, safety or family business logic.
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

/**
 * There is deliberately no READY/ACTIVE value yet. Adding one requires a separately confirmed,
 * versioned backend contract and the corresponding transport/schema implementation.
 */
enum class ClientContractActivation {
    BLOCKED
}

data class ClientContractGate(
    val capability: BackendContractCapability,
    val activation: ClientContractActivation = ClientContractActivation.BLOCKED,
    val uiState: ClientContractUiState = ClientContractUiState.UNKNOWN
) {
    /** Client state alone is never canonical backend authority. */
    val backendAuthorityAvailable: Boolean = false

    /** Loading/error/local state must never be promoted to a successful backend result. */
    val mayAssumeSuccess: Boolean = false

    /** Authority-bearing actions stay disabled until their exact backend contract is activated. */
    val maySubmitAuthorityBearingAction: Boolean = false
}

object BackendContractReadiness {
    val gates: List<ClientContractGate> = BackendContractCapability.values().map { capability ->
        ClientContractGate(capability = capability)
    }

    val activatedCount: Int = 0

    fun gateFor(capability: BackendContractCapability): ClientContractGate =
        gates.first { it.capability == capability }

    fun stateFor(
        capability: BackendContractCapability,
        uiState: ClientContractUiState
    ): ClientContractGate = ClientContractGate(
        capability = capability,
        uiState = uiState
    )
}
