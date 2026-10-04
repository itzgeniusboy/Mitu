package com.mitu.assistant.data.secure

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SecureKeyStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val masterKey: MasterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPreferences: SharedPreferences = EncryptedSharedPreferences.create(
        context,
        "mitu_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun getApiKey(providerKey: String): String? {
        return sharedPreferences.getString("key_$providerKey", null)
    }

    fun saveApiKey(providerKey: String, apiKey: String) {
        sharedPreferences.edit().putString("key_$providerKey", apiKey.trim()).apply()
    }

    fun deleteApiKey(providerKey: String) {
        sharedPreferences.edit().remove("key_$providerKey").apply()
    }

    fun clearAllKeys() {
        sharedPreferences.edit().clear().apply()
    }
}
