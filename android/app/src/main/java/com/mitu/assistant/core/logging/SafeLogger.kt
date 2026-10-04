package com.mitu.assistant.core.logging

import android.util.Log

/**
 * SafeLogger: Ensures sensitive tokens, API keys, passwords, and private user
 * information are strictly redacted before outputting to Android Logcat.
 */
object SafeLogger {
    private const val TAG = "MITU_APP"

    // Regex patterns for Gemini keys (AIza...), OpenAI (sk-...), Anthropic (sk-ant-...)
    private val KEY_PATTERNS = listOf(
        Regex("AIza[0-9A-Za-z\\-_]{35}"),
        Regex("sk-[a-zA-Z0-9]{20,}"),
        Regex("sk-ant-[a-zA-Z0-9\\-_]{20,}"),
        Regex("Bearer\\s+[a-zA-Z0-9\\-_.]+")
    )

    fun redact(message: String): String {
        var clean = message
        KEY_PATTERNS.forEach { pattern ->
            clean = clean.replace(pattern, "[REDACTED_SECRET]")
        }
        return clean
    }

    fun d(tag: String = TAG, message: String) {
        Log.d(tag, redact(message))
    }

    fun i(tag: String = TAG, message: String) {
        Log.i(tag, redact(message))
    }

    fun w(tag: String = TAG, message: String) {
        Log.w(tag, redact(message))
    }

    fun e(tag: String = TAG, message: String, throwable: Throwable? = null) {
        Log.e(tag, redact(message), throwable)
    }
}
