package com.mitu.assistant.providers

import com.mitu.assistant.core.util.MituResult
import kotlinx.coroutines.flow.Flow

data class ProviderCapabilities(
    val supportsTools: Boolean,
    val supportsVision: Boolean,
    val supportsLiveVoice: Boolean
)

data class ChatMessage(
    val role: String,
    val content: String
)

interface LlmProvider {
    val providerId: String
    val displayName: String
    val capabilities: ProviderCapabilities

    /**
     * @param baseUrl optional provider endpoint override; OpenAI-compatible providers must not be
     * pinned to one vendor's URL (Groq) or every other provider fails verification.
     */
    suspend fun testKey(apiKey: String, model: String? = null, baseUrl: String? = null): MituResult<Boolean>

    suspend fun streamChat(
        messages: List<ChatMessage>,
        model: String,
        apiKey: String,
        systemPrompt: String? = null,
        temperature: Float = 0.7f,
        baseUrl: String? = null
    ): Flow<MituResult<String>>

    suspend fun listAvailableModels(): List<String>
}
