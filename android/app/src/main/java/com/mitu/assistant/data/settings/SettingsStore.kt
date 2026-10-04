package com.mitu.assistant.data.settings

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import com.mitu.assistant.domain.models.ProviderType
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * SettingsStore: non-secret assistant preferences (which provider/model Mitu is using).
 * API keys never live here — they stay in SecureKeyStore (EncryptedSharedPreferences).
 */
@Singleton
class SettingsStore @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences(FILE_NAME, Context.MODE_PRIVATE)

    var providerType: ProviderType
        get() = runCatching {
            ProviderType.valueOf(prefs.getString(KEY_PROVIDER, ProviderType.GEMINI.name) ?: ProviderType.GEMINI.name)
        }.getOrDefault(ProviderType.GEMINI)
        set(value) = prefs.edit { putString(KEY_PROVIDER, value.name) }

    var model: String
        get() = prefs.getString(KEY_MODEL, "").orEmpty()
        set(value) = prefs.edit { putString(KEY_MODEL, value.trim()) }

    fun clear() = prefs.edit { clear() }

    private companion object {
        const val FILE_NAME = "mitu_settings"
        const val KEY_PROVIDER = "active_provider"
        const val KEY_MODEL = "active_model"
    }
}
