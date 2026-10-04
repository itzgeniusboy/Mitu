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
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GeminiProvider @Inject constructor(
    private val okHttpClient: OkHttpClient
) : LlmProvider {

    override val providerId: String = "gemini"
    override val displayName: String = "Google Gemini"
    override val capabilities: ProviderCapabilities = ProviderCapabilities(
        supportsTools = true,
        supportsVision = true,
        supportsLiveVoice = true
    )

    private val json = Json { ignoreUnknownKeys = true }

    // baseUrl is intentionally unused: the Gemini API endpoint is fixed.
    override suspend fun testKey(apiKey: String, model: String?, baseUrl: String?): MituResult<Boolean> {
        val targetModel = model ?: "gemini-3.8-flash"
        val url = "https://generativelanguage.googleapis.com/v1beta/models/$targetModel:generateContent?key=$apiKey"

        val bodyJson = buildJsonObject {
            putJsonArray("contents") {
                addJsonObject {
                    put("role", "user")
                    putJsonArray("parts") {
                        addJsonObject { put("text", "Hi") }
                    }
                }
            }
        }.toString()

        val request = Request.Builder()
            .url(url)
            .post(bodyJson.toRequestBody("application/json".toMediaType()))
            .build()

        return try {
            val response = okHttpClient.newCall(request).execute()
            if (response.isSuccessful) {
                MituResult.Success(true, verifiedState = "Key valid. HTTP ${response.code}")
            } else {
                val errBody = response.body?.string() ?: ""
                MituResult.Error(
                    message = "Gemini key validation failed (HTTP ${response.code})",
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
        temperature: Float,
        baseUrl: String?
    ): Flow<MituResult<String>> = flow {
        emit(MituResult.Loading)
        val url = "https://generativelanguage.googleapis.com/v1beta/models/$model:streamGenerateContent?key=$apiKey&alt=sse"

        val bodyJson = buildJsonObject {
            systemPrompt?.let {
                put("systemInstruction", buildJsonObject {
                    putJsonArray("parts") {
                        addJsonObject { put("text", it) }
                    }
                })
            }
            putJsonArray("contents") {
                messages.forEach { msg ->
                    addJsonObject {
                        put("role", if (msg.role == "assistant") "model" else "user")
                        putJsonArray("parts") {
                            addJsonObject { put("text", msg.content) }
                        }
                    }
                }
            }
            put("generationConfig", buildJsonObject {
                put("temperature", temperature)
            })
        }.toString()

        val request = Request.Builder()
            .url(url)
            .post(bodyJson.toRequestBody("application/json".toMediaType()))
            .build()

        try {
            val response = okHttpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                emit(MituResult.Error("Gemini error HTTP ${response.code}: ${response.message}"))
                return@flow
            }

            val source = response.body?.source() ?: return@flow
            while (!source.exhausted()) {
                val line = source.readUtf8Line() ?: break
                if (line.startsWith("data: ")) {
                    val rawJson = line.substring(6).trim()
                    try {
                        val parsed = json.parseToJsonElement(rawJson).jsonObject
                        val text = parsed["candidates"]?.jsonArray?.getOrNull(0)
                            ?.jsonObject?.get("content")?.jsonObject
                            ?.get("parts")?.jsonArray?.getOrNull(0)
                            ?.jsonObject?.get("text")?.jsonPrimitive?.content

                        if (!text.isNullOrEmpty()) {
                            emit(MituResult.Success(text))
                        }
                    } catch (e: Exception) {
                        // ignore heartbeat or partial malformed lines
                    }
                }
            }
        } catch (e: Exception) {
            emit(MituResult.Error("Streaming error: ${e.message}", cause = e))
        }
    }.flowOn(Dispatchers.IO)

    override suspend fun listAvailableModels(): List<String> = listOf(
        "gemini-3.8-flash",
        "gemini-3.1-pro-preview",
        "gemini-3.1-flash-lite",
        "gemini-3.8-live"
    )
}
