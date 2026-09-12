package com.nahwerk.concierge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.Instant

class AppProdGatewaySurfaceTest {
    @Test
    fun reminderInputUsesBerlinTimezoneAndFutureOnly() {
        val now = Instant.parse("2026-09-12T18:00:00Z")
        assertEquals("2026-09-13T08:30:00Z", reminderInputToIso("2026-09-13 10:30", now))
        assertNull(reminderInputToIso("2026-09-12 19:00", now))
        assertNull(reminderInputToIso("morgen früh", now))
    }
}
