package com.mitu.assistant.core.util

/**
 * MituResult: Honesty-first result wrapper.
 * Every tool and action returns verified state to ensure no faked success.
 */
sealed class MituResult<out T> {
    data class Success<out T>(
        val data: T,
        val verifiedState: String? = null
    ) : MituResult<T>()

    data class Error(
        val message: String,
        val errorReason: String? = null,
        val cause: Throwable? = null,
        val isRecoverable: Boolean = true
    ) : MituResult<Nothing>()

    object Loading : MituResult<Nothing>()
}
