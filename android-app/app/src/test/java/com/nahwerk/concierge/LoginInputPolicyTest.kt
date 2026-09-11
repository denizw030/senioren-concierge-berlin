package com.nahwerk.concierge

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LoginInputPolicyTest {
    @Test
    fun acceptsStructurallyValidEmailAndEightCharacterPassword() {
        assertTrue(LoginInputPolicy.canSubmit("  user@example.com  ", "12345678"))
    }

    @Test
    fun rejectsMalformedEmailWithoutSubmitting() {
        assertFalse(LoginInputPolicy.canSubmit("userexample.com", "12345678"))
        assertFalse(LoginInputPolicy.canSubmit("user@localhost", "12345678"))
        assertFalse(LoginInputPolicy.canSubmit("user @example.com", "12345678"))
        assertFalse(LoginInputPolicy.canSubmit("user@@example.com", "12345678"))
    }

    @Test
    fun rejectsShortPassword() {
        assertFalse(LoginInputPolicy.canSubmit("user@example.com", "1234567"))
    }
}
