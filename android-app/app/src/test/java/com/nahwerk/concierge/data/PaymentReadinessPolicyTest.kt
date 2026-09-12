package com.nahwerk.concierge.data

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PaymentReadinessPolicyTest {
    private fun ready(
        production: Boolean = true,
        provider: String = "stripe",
        keyMode: String = "live",
        apiReachable: Boolean = true,
        apiLivemode: Boolean? = true,
        liveConfirmed: Boolean = true,
        webhookSecretConfigured: Boolean = true,
        webhookEndpointConfigured: Boolean = true,
        webhookEndpointEnabled: Boolean = true,
        webhookRequiredEventsComplete: Boolean = true,
        serverPaymentReady: Boolean = true
    ) = PaymentReadinessPolicy.confirmedReady(
        production,
        provider,
        keyMode,
        apiReachable,
        apiLivemode,
        liveConfirmed,
        webhookSecretConfigured,
        webhookEndpointConfigured,
        webhookEndpointEnabled,
        webhookRequiredEventsComplete,
        serverPaymentReady
    )

    @Test
    fun acceptsOnlyFullyConfirmedLiveStripeRuntime() {
        assertTrue(ready())
    }

    @Test
    fun rejectsTestModeOrUnknownProvider() {
        assertFalse(ready(keyMode = "test"))
        assertFalse(ready(provider = "unknown"))
    }

    @Test
    fun rejectsMissingWebhookOrServerReadiness() {
        assertFalse(ready(webhookEndpointEnabled = false))
        assertFalse(ready(webhookRequiredEventsComplete = false))
        assertFalse(ready(serverPaymentReady = false))
    }

    @Test
    fun rejectsUnconfirmedStripeApiLivemode() {
        assertFalse(ready(apiLivemode = null))
        assertFalse(ready(apiLivemode = false))
        assertFalse(ready(apiReachable = false))
    }
}
