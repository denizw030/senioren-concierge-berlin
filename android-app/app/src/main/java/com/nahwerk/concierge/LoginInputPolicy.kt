package com.nahwerk.concierge

internal object LoginInputPolicy {
    fun normalizedEmail(raw: String): String = raw.trim()

    fun isEmailStructurallyValid(raw: String): Boolean {
        val email = normalizedEmail(raw)
        if (email.isBlank() || email.any(Char::isWhitespace)) return false
        val at = email.indexOf('@')
        if (at <= 0 || at != email.lastIndexOf('@')) return false
        val domain = email.substring(at + 1)
        if (domain.length < 3 || domain.startsWith('.') || domain.endsWith('.')) return false
        val dot = domain.lastIndexOf('.')
        return dot > 0 && dot < domain.lastIndex
    }

    fun canSubmit(email: String, password: String): Boolean =
        isEmailStructurallyValid(email) && password.length >= 8
}
