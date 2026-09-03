package com.nahwerk.concierge.data

import java.util.UUID

object ChatRequestContract {
    fun create(
        message: String,
        idFactory: () -> String = { UUID.randomUUID().toString() },
        correlationFactory: () -> String = { UUID.randomUUID().toString() },
        nowMillis: () -> Long = { System.currentTimeMillis() }
    ): PendingChatRequest {
        val normalized = message.trim()
        require(normalized.isNotEmpty()) { "message_required" }
        require(normalized.length <= 4000) { "message_too_long" }
        val sourceMessageId = idFactory().trim()
        require(sourceMessageId.isNotEmpty()) { "source_message_id_required" }
        require(sourceMessageId.length <= 200) { "source_message_id_too_long" }
        val correlationId = correlationFactory().trim()
        require(correlationId.isNotEmpty()) { "correlation_id_required" }
        require(correlationId.length <= 200) { "correlation_id_too_long" }
        return PendingChatRequest(
            sourceMessageId = sourceMessageId,
            correlationId = correlationId,
            message = normalized,
            createdAtEpochMillis = nowMillis()
        )
    }

    fun headers(request: PendingChatRequest): Map<String, String> = mapOf(
        "Idempotency-Key" to request.sourceMessageId,
        "X-Client-Request-Id" to request.sourceMessageId
    )
}
