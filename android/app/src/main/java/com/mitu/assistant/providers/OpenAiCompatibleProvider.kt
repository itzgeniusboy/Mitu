package com.mitu.assistant.providers

import com.mitu.assistant.core.logging.SafeLogger
import com.mitu.assistant.core.util.MituResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OpenAiCompatibleProvider @Inject constructor(
    private val okHttpClient: OkHttpClient
) : LlmProvider {

    override val providerId: String = "openai_compatible"
    override val displayName: String = "OpenAI Compatible / Groq / OpenRouter"
    override val capabilities: ProviderCapabilities = ProviderCapabilities(
        supportsTools = true,
        supportsVision = true,
        supportsLiveVoice = false
    )

    private val json = Json { ignoreUnknownKeys = true }

    override suspend fun testKey(apiKey: String, model: String?): MituResult<Boolean> {
        val targetModel = model ?: "llama-3.3-70b-versatile"
        val url = "https://api.groq.com/openai/v1/chat/completions"

        val bodyJson = buildJsonObject {
            put("model", targetModel)
            putJsonArray("messages") {
                addJsonObject {
                    put("role", "user")
                    put("content", "Hi")
                }
            }
            put("max_tokens", 5)
        }.toString()

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $apiKey")
            .post(bodyJson.toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            val response = okHttpClient.newCall(request).execute()
            if (response.isSuccessful) {
                MituResult.Success(true, "Key valid. HTTP ${response.code}")
            } else {
                val errBody = response.body?.string() ?: ""
                MituResult.Error(
                    message = "Provider test failed (HTTP ${response.code})",
                    errorReason = SafeLogger.redact(errBody)
                )
            }
        } catch (e: Exception) {
            MituResult.Error("Network error: ${e.message}", cause = e)
        }
    }

    override suspend fun streamChat(
        messages: List<ChatMessage>,
        model: String,
        apiKey: String,
        systemPrompt: String?,
        temperature: Float
    ): Flow<MituResult<String>> = flow {
        emit(MituResult.Loading)
        val url = "https://api.groq.com/openai/v1/chat/completions"

        val bodyJson = buildJsonObject {
            put("model", model)
            put("stream", true)
            put("temperature", temperature)
            putJsonArray("messages") {
                systemPrompt?.let {
                    addJsonObject {
                        put("role", "system")
                        put("content", it)
                    }
                }
                messages.forEach { msg ->
                    addJsonObject {
                        put("role", msg.role)
                        put("content", msg.content)
                    }
                }
            }
        }.toString()

        val request = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $apiKey")
            .post(bodyJson.toRequestBody("application/json".toMediaType()))
            .build()

        try {
            val response = okHttpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                emit(MituResult.Error("HTTP ${response.code}: ${response.message}"))
                return@flow
            }

            val source = response.body?.source() ?: return@flow
            while (!source.exhausted()) {
                val line = source.readUtf8Line() ?: break
                if (line.startsWith("data: ") && !line.contains("[DONE]")) {
                    val rawJson = line.substring(6).trim()
                    try {
                        val parsed = json.parseToJsonElement(rawJson).jsonObject
                        val delta = parsed["choices"]?.jsonArray?.getOrNull(0)
                            ?.jsonObject?.get("delta")?.jsonObject
                            ?.get("content")?.jsonPrimitive?.content

                        if (!delta.isNullOrEmpty()) {
                            emit(MituResult.Success(delta))
                        }
                    } catch (_: Exception) {}
                }
            }
        } catch (e: Exception) {
            emit(MituResult.Error("Streaming error: ${e.message}", cause = e))
        }
    }.flowOn(Dispatchers.IO)

    override suspend fun listAvailableModels(): List<String> = listOf(
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "meta-llama/llama-3.2-3b-instruct:free"
    )
}
