package com.nahwerk.concierge

internal object AppStatePolicy {
    fun restoredScreen(hasSession: Boolean, savedScreen: String?): AppScreen {
        if (!hasSession) return AppScreen.LOGIN
        val restored = savedScreen
            ?.let { runCatching { AppScreen.valueOf(it) }.getOrNull() }
            ?.takeUnless { it == AppScreen.LOGIN }
        return restored ?: AppScreen.HOME
    }

    fun backTarget(screen: AppScreen): AppScreen? = when (screen) {
        AppScreen.CHAT,
        AppScreen.REMINDERS,
        AppScreen.SETTINGS -> AppScreen.HOME
        AppScreen.LOGIN,
        AppScreen.HOME -> null
    }
}
