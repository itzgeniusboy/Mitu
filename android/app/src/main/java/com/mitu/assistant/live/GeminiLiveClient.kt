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
import kotlinx.serialization.json.add
import kotlinx.serialization.json.addJsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import kotlinx.serialization.json.putJsonObject
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

    /**
     * "Connected" means the server accepted our setup message (`setupComplete`), not merely that
     * the socket opened — audio sent before the handshake is rejected by the API.
     */
    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected.asStateFlow()

    // Mic frames captured during the setup window are buffered and flushed, so the first words of
    // a turn are not dropped while we wait for setupComplete.
    private val pendingAudio = ArrayDeque<ByteArray>()
    private val maxPendingChunks = 48

    private val _events = MutableSharedFlow<LiveEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<LiveEvent> = _events.asSharedFlow()

    fun connect(apiKey: String, voiceName: String = "Zephyr") {
        _isConnected.value = false
        pendingAudio.clear()

        val url = "${geminiConfig.liveEndpointUrl}?key=$apiKey"
        val request = Request.Builder().url(url).build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                SafeLogger.i("GeminiLiveClient", "WebSocket opened; sending setup message")
                sendSetupMessage(webSocket, voiceName)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleIncomingMessage(text)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                SafeLogger.e("GeminiLiveClient", "WebSocket failure: ${t.message}")
                _isConnected.value = false
                pendingAudio.clear()
                scope.launch {
                    _events.emit(LiveEvent.ConnectionError(t.message ?: "Connection failure"))
                }
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                _isConnected.value = false
                pendingAudio.clear()
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
                // Transcripts are only streamed back when explicitly requested; without these the
                // user's own speech never comes back to the UI.
                putJsonObject("inputAudioTranscription") {}
                putJsonObject("outputAudioTranscription") {}
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
        val ws = webSocket ?: return

        if (!_isConnected.value) {
            if (pendingAudio.size >= maxPendingChunks) pendingAudio.removeFirst()
            pendingAudio.addLast(pcm16Bytes)
            return
        }

        ws.send(audioFrame(android.util.Base64.encodeToString(pcm16Bytes, android.util.Base64.NO_WRAP)))
    }

    /**
     * `realtimeInput.mediaChunks[]` is deprecated (the API reads `audio` / `video` / `text` now),
     * which is why calling mode never heard the user: audio has to be one `audio` Blob.
     */
    private fun audioFrame(base64Pcm16: String): String = buildJsonObject {
        put("realtimeInput", buildJsonObject {
            put("audio", buildJsonObject {
                put("mimeType", geminiConfig.pcmEncoding)
                put("data", base64Pcm16)
            })
        })
    }.toString()

    private fun flushPendingAudio() {
        val ws = webSocket ?: return
        while (pendingAudio.isNotEmpty()) {
            val chunk = pendingAudio.removeFirst()
            ws.send(audioFrame(android.util.Base64.encodeToString(chunk, android.util.Base64.NO_WRAP)))
        }
    }

    private fun handleIncomingMessage(text: String) {
        try {
            val element = json.parseToJsonElement(text).jsonObject

            // 1. Setup handshake: only now may audio be streamed.
            if (element.containsKey("setupComplete")) {
                _isConnected.value = true
                SafeLogger.i("GeminiLiveClient", "Live session ready (setupComplete)")
                flushPendingAudio()
                return
            }

            // 2. A rejected setup / quota problem arrives as an application error on a live socket.
            element["error"]?.jsonObject?.let { error ->
                val message = error["message"]?.jsonPrimitive?.content ?: "Live API error"
                val status = error["status"]?.jsonPrimitive?.content
                _isConnected.value = false
                pendingAudio.clear()
                SafeLogger.e("GeminiLiveClient", "Live API error: $message")
                scope.launch {
                    _events.emit(LiveEvent.ConnectionError(if (status != null) "$message ($status)" else message))
                }
                return
            }

            val serverContent = element["serverContent"]?.jsonObject ?: return

            // 3. Barge-in flag is a JSON boolean, so compare it as one instead of string-matching.
            if (serverContent["interrupted"]?.jsonPrimitive?.booleanOrNull == true) {
                scope.launch { _events.emit(LiveEvent.Interrupted) }
            }

            // 4. Model turn audio (+ any text parts).
            val parts = serverContent["modelTurn"]?.jsonObject?.get("parts")?.jsonArray
            var emittedModelText = false

            parts?.forEach { partElement ->
                val part = partElement.jsonObject
                val dataBase64 = part["inlineData"]?.jsonObject?.get("data")?.jsonPrimitive?.content
                if (dataBase64 != null) {
                    val pcmBytes = android.util.Base64.decode(dataBase64, android.util.Base64.NO_WRAP)
                    scope.launch { _events.emit(LiveEvent.AudioOutput(pcmBytes)) }
                }

                val textPart = part["text"]?.jsonPrimitive?.content
                if (!textPart.isNullOrBlank()) {
                    emittedModelText = true
                    scope.launch { _events.emit(LiveEvent.TranscriptReceived(textPart, isUser = false)) }
                }
            }

            // 5. Transcripts. Fall back to outputTranscription only when the turn carried no text
            // part, otherwise the assistant line would be rendered twice.
            if (!emittedModelText) {
                val outputText = serverContent["outputTranscription"]?.jsonObject
                    ?.get("text")?.jsonPrimitive?.content
                if (!outputText.isNullOrBlank()) {
                    scope.launch { _events.emit(LiveEvent.TranscriptReceived(outputText, isUser = false)) }
                }
            }

            val inputText = serverContent["inputTranscription"]?.jsonObject
                ?.get("text")?.jsonPrimitive?.content
            if (!inputText.isNullOrBlank()) {
                scope.launch { _events.emit(LiveEvent.TranscriptReceived(inputText, isUser = true)) }
            }

            // 6. Server asks us to close (token expiry, idle timeout).
            if (element.containsKey("goAway")) {
                scope.launch { _events.emit(LiveEvent.SessionClosed) }
            }
        } catch (e: Exception) {
            SafeLogger.w("GeminiLiveClient", "Message parse warning: ${e.message}")
        }
    }

    fun disconnect() {
        webSocket?.close(1000, "User closed calling mode")
        webSocket = null
        pendingAudio.clear()
        _isConnected.value = false
    }
}
