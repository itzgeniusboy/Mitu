package com.mitu.assistant.live

import com.mitu.assistant.core.logging.SafeLogger
import com.mitu.assistant.data.settings.GeminiConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

sealed class LiveEvent {
    data class AudioOutput(val pcmData: ByteArray) : LiveEvent()
    data class TranscriptReceived(val text: String, val isUser: Boolean) : LiveEvent()
    object Interrupted : LiveEvent()
    data class ConnectionError(val reason: String) : LiveEvent()
    object SessionClosed : LiveEvent()
}

@Singleton
class GeminiLiveClient @Inject constructor(
    private val geminiConfig: GeminiConfig
) {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .pingInterval(20, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private val json = Json { ignoreUnknownKeys = true }
    private val scope = CoroutineScope(Dispatchers.IO + Job())

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    private val _events = MutableSharedFlow<LiveEvent>()
    val events: SharedFlow<LiveEvent> = _events.asSharedFlow()

    fun connect(apiKey: String, voiceName: String = "Zephyr") {
        val url = "${geminiConfig.liveEndpointUrl}?key=$apiKey"
        val request = Request.Builder().url(url).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                SafeLogger.i("GeminiLiveClient", "Live session WebSocket opened")
                _isConnected.value = true
                sendSetupMessage(webSocket, voiceName)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleIncomingMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                SafeLogger.e("GeminiLiveClient", "WebSocket failure: ${t.message}")
                _isConnected.value = false
                scope.launch {
                    _events.emit(LiveEvent.ConnectionError(t.message ?: "Connection failure"))
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                _isConnected.value = false
                scope.launch {
                    _events.emit(LiveEvent.SessionClosed)
                }
            }
        })
    }

    private fun sendSetupMessage(ws: WebSocket, voiceName: String) {
        // Construct standard Gemini Live setup protocol message
        val setupPayload = buildJsonObject {
            put("setup", buildJsonObject {
                put("model", "models/${geminiConfig.liveModel}")
                put("generationConfig", buildJsonObject {
                    putJsonArray("responseModalities") {
                        add("AUDIO")
                    }
                    put("speechConfig", buildJsonObject {
                        put("voiceConfig", buildJsonObject {
                            put("prebuiltVoiceConfig", buildJsonObject {
                                put("voiceName", voiceName)
                            })
                        })
                    })
                })
                put("systemInstruction", buildJsonObject {
                    putJsonArray("parts") {
                        addJsonObject {
                            put("text", geminiConfig.defaultSystemPrompt)
                        }
                    }
                })
            })
        }.toString()

        ws.send(setupPayload)
    }

    fun sendPcmChunk(pcm16Bytes: ByteArray) {
        if (!_isConnected.value) return
        val base64 = android.util.Base64.encodeToString(pcm16Bytes, android.util.Base64.NO_WRAP)
        val audioPayload = buildJsonObject {
            put("realtimeInput", buildJsonObject {
                putJsonArray("mediaChunks") {
                    addJsonObject {
                        put("mimeType", geminiConfig.pcmEncoding)
                        put("data", base64)
                    }
                }
            })
        }.toString()

        webSocket?.send(audioPayload)
    }

    private fun handleIncomingMessage(text: String) {
        try {
            val element = json.parseToJsonElement(text).jsonObject
            val serverContent = element["serverContent"]?.jsonObject

            // Check if model was interrupted (barge-in event from server)
            if (serverContent?.get("interrupted")?.jsonPrimitive?.content == "true") {
                scope.launch { _events.emit(LiveEvent.Interrupted) }
                return
            }

            // Check for audio output turn
            val modelTurn = serverContent?.get("modelTurn")?.jsonObject
            val parts = modelTurn?.get("parts")?.jsonArray

            parts?.forEach { partElement ->
                val inlineData = partElement.jsonObject["inlineData"]?.jsonObject
                val dataBase64 = inlineData?.get("data")?.jsonPrimitive?.content
                if (dataBase64 != null) {
                    val pcmBytes = android.util.Base64.decode(dataBase64, android.util.Base64.DEFAULT)
                    scope.launch { _events.emit(LiveEvent.AudioOutput(pcmBytes)) }
                }

                val textPart = partElement.jsonObject["text"]?.jsonPrimitive?.content
                if (!textPart.isNullOrEmpty()) {
                    scope.launch { _events.emit(LiveEvent.TranscriptReceived(textPart, isUser = false)) }
                }
            }
        } catch (e: Exception) {
            SafeLogger.w("GeminiLiveClient", "Message parse warning: ${e.message}")
        }
    }

    fun disconnect() {
        webSocket?.close(1000, "User closed calling mode")
        webSocket = null
        _isConnected.value = false
    }
}
