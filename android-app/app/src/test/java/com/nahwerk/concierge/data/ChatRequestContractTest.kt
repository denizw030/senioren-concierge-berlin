package com.nahwerk.concierge.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class ChatRequestContractTest {
    @Test
    fun samePendingRequestKeepsSameSourceMessageIdAcrossRetries() {
        val request = ChatRequestContract.create(
            message = "  Hallo Concierge  ",
            idFactory = { "fixed-source-message-id" },
            correlationFactory = { "fixed-correlation-id" },
            nowMillis = { 1234L }
        )

        val firstHeaders = ChatRequestContract.headers(request)
        val retryHeaders = ChatRequestContract.headers(request)

        assertEquals("Hallo Concierge", request.message)
        assertEquals("fixed-source-message-id", request.sourceMessageId)
        assertEquals("fixed-correlation-id", request.correlationId)
        assertEquals("fixed-source-message-id", firstHeaders["Idempotency-Key"])
        assertEquals("fixed-source-message-id", firstHeaders["X-Client-Request-Id"])
        assertEquals(firstHeaders, retryHeaders)
    }

    @Test
    fun separateUserSendsReceiveSeparateIds() {
        var counter = 0
        val first = ChatRequestContract.create("Hallo", idFactory = { "id-${++counter}" })
        val second = ChatRequestContract.create("Hallo", idFactory = { "id-${++counter}" })

        assertNotEquals(first.sourceMessageId, second.sourceMessageId)
    }
}
