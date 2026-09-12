package com.nahwerk.concierge.data

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProdCustomerPolicyTest {
    @Test
    fun registration_requires_real_email_and_long_password() {
        assertTrue(ProdCustomerPolicy.validEmail("kunde@example.de"))
        assertFalse(ProdCustomerPolicy.validEmail("kunde"))
        assertFalse(ProdCustomerPolicy.validRegistrationPassword("zu-kurz"))
        assertTrue(ProdCustomerPolicy.validRegistrationPassword("mindestens-15-Zeichen"))
    }

    @Test
    fun safety_times_are_fail_closed() {
        assertFalse(ProdCustomerPolicy.validCheckinTimes(emptyList(), enabled = true))
        assertTrue(ProdCustomerPolicy.validCheckinTimes(listOf("09:00", "18:30"), enabled = true))
        assertFalse(ProdCustomerPolicy.validCheckinTimes(listOf("25:00"), enabled = true))
        assertFalse(ProdCustomerPolicy.validCheckinTimes(listOf("08:00", "10:00", "12:00", "14:00", "16:00"), enabled = true))
    }

    @Test
    fun money_format_never_estimates() {
        assertEquals("5,99 €", ProdCustomerPolicy.euro(599))
        assertEquals("-1,25 €", ProdCustomerPolicy.euro(-125))
    }
}
