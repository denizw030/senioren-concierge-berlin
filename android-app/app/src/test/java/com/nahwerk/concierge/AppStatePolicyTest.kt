package com.nahwerk.concierge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AppStatePolicyTest {
    @Test
    fun recreationRestoresAuthenticatedChildScreen() {
        assertEquals(AppScreen.CHAT, AppStatePolicy.restoredScreen(true, AppScreen.CHAT.name))
        assertEquals(AppScreen.REMINDERS, AppStatePolicy.restoredScreen(true, AppScreen.REMINDERS.name))
        assertEquals(AppScreen.SETTINGS, AppStatePolicy.restoredScreen(true, AppScreen.SETTINGS.name))
    }

    @Test
    fun recreationFallsBackSafelyWhenSessionOrSavedScreenIsInvalid() {
        assertEquals(AppScreen.LOGIN, AppStatePolicy.restoredScreen(false, AppScreen.CHAT.name))
        assertEquals(AppScreen.HOME, AppStatePolicy.restoredScreen(true, AppScreen.LOGIN.name))
        assertEquals(AppScreen.HOME, AppStatePolicy.restoredScreen(true, "NOT_A_SCREEN"))
        assertEquals(AppScreen.HOME, AppStatePolicy.restoredScreen(true, null))
    }

    @Test
    fun systemBackContractReturnsChildScreensToHomeOnly() {
        assertEquals(AppScreen.HOME, AppStatePolicy.backTarget(AppScreen.CHAT))
        assertEquals(AppScreen.HOME, AppStatePolicy.backTarget(AppScreen.REMINDERS))
        assertEquals(AppScreen.HOME, AppStatePolicy.backTarget(AppScreen.SETTINGS))
        assertNull(AppStatePolicy.backTarget(AppScreen.HOME))
        assertNull(AppStatePolicy.backTarget(AppScreen.LOGIN))
    }
}
