package com.mitu.assistant.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mitu.assistant.core.util.MituResult
import com.mitu.assistant.data.room.ChatMessageDao
import com.mitu.assistant.data.room.ChatMessageEntity
import com.mitu.assistant.data.secure.SecureKeyStore
import com.mitu.assistant.data.settings.GeminiConfig
import com.mitu.assistant.data.settings.SettingsStore
import com.mitu.assistant.domain.models.AssistantState
import com.mitu.assistant.domain.models.ProviderType
import com.mitu.assistant.providers.ChatMessage
import com.mitu.assistant.providers.GeminiProvider
import com.mitu.assistant.providers.OpenAiCompatibleProvider
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * AssistantViewModel: the single owner of MITU's UI state machine.
 *
 * The mascot used to be fed a `remember { mutableStateOf(STANDBY) }` that nothing ever wrote to,
 * so it was frozen in STANDBY; every state below is produced by real events (send, stream, error).
 */
@HiltViewModel
class AssistantViewModel @Inject constructor(
    private val chatMessageDao: ChatMessageDao,
    private val secureKeyStore: SecureKeyStore,
    private val settingsStore: SettingsStore,
    private val geminiConfig: GeminiConfig,
    private val geminiProvider: GeminiProvider,
    private val openAiCompatibleProvider: OpenAiCompatibleProvider
) : ViewModel() {

    private val _assistantState = MutableStateFlow(AssistantState.STANDBY)
    val assistantState: StateFlow<AssistantState> = _assistantState.asStateFlow()

    private val _providerType = MutableStateFlow(settingsStore.providerType)
    val providerType: StateFlow<ProviderType> = _providerType.asStateFlow()

    private val _model = MutableStateFlow(settingsStore.model.ifBlank { defaultModelFor(_providerType.value) })
    val model: StateFlow<String> = _model.asStateFlow()

    private val _streamingReply = MutableStateFlow("")
    val streamingReply: StateFlow<String> = _streamingReply.asStateFlow()

    private val _isBusy = MutableStateFlow(false)
    val isBusy: StateFlow<Boolean> = _isBusy.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _keyTestStatus = MutableStateFlow<String?>(null)
    val keyTestStatus: StateFlow<String?> = _keyTestStatus.asStateFlow()

    private val _savedKeyProviders = MutableStateFlow(ProviderType.entries.filter { hasKey(it) }.map { it.name }.toSet())
    val savedKeyProviders: StateFlow<Set<String>> = _savedKeyProviders.asStateFlow()

    val messages: StateFlow<List<ChatMessageEntity>> = chatMessageDao.getAllMessages()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())

    private var streamJob: Job? = null

    /** Providers this module can actually talk to; others are shown but disabled, never faked. */
    fun isImplemented(type: ProviderType): Boolean = type != ProviderType.ANTHROPIC

    fun defaultModelFor(type: ProviderType): String = when (type) {
        ProviderType.GEMINI -> geminiConfig.textModel
        ProviderType.GROQ -> "llama-3.3-70b-versatile"
        ProviderType.OPENROUTER -> "meta-llama/llama-3.2-3b-instruct:free"
        ProviderType.OPENAI -> "gpt-4o-mini"
        ProviderType.LOCAL_OLLAMA -> "llama3.1"
        ProviderType.ANTHROPIC -> "claude-3-5-haiku-latest"
    }

    fun selectProvider(type: ProviderType) {
        if (!isImplemented(type)) return
        _providerType.value = type
        _model.value = defaultModelFor(type)
        settingsStore.providerType = type
        settingsStore.model = _model.value
        _keyTestStatus.value = null
        _savedKeyProviders.value = ProviderType.entries.filter { hasKey(it) }.map { it.name }.toSet()
    }

    fun setModel(value: String) {
        _model.value = value.trim()
        settingsStore.model = _model.value
    }

    fun saveApiKey(value: String) {
        val type = _providerType.value
        val trimmed = value.trim()
        if (trimmed.isEmpty()) {
            secureKeyStore.deleteApiKey(type.name)
        } else {
            secureKeyStore.saveApiKey(type.name, trimmed)
        }
        _savedKeyProviders.value = ProviderType.entries.filter { hasKey(it) }.map { it.name }.toSet()
        _keyTestStatus.value = if (trimmed.isEmpty()) "Key removed" else "Stored in EncryptedSharedPreferences"
    }

    fun testCurrentKey() {
        val type = _providerType.value
        viewModelScope.launch {
            _keyTestStatus.value = "Testing…"
            val result = providerFor(type).testKey(apiKeyFor(type), _model.value, type.defaultBaseUrl)
            _keyTestStatus.value = when (result) {
                is MituResult.Success -> "Key valid${result.verifiedState?.let { " ($it)" } ?: ""}"
                is MituResult.Error -> "Failed: ${result.message}"
                MituResult.Loading -> "Testing…"
            }
        }
    }

    fun clearStoredKeys() {
        secureKeyStore.clearAllKeys()
        _savedKeyProviders.value = emptySet()
        _keyTestStatus.value = "All keys removed"
    }

    fun send(rawText: String) {
        val text = rawText.trim()
        if (text.isEmpty() || _isBusy.value) return

        streamJob?.cancel()
        streamJob = viewModelScope.launch {
            val type = _providerType.value
            val model = _model.value.ifBlank { defaultModelFor(type) }
            val apiKey = apiKeyFor(type)
            if (apiKey.isBlank() && type != ProviderType.LOCAL_OLLAMA) {
                _errorMessage.value = "Add your ${type.displayName} API key in Settings first."
                _assistantState.value = AssistantState.ERROR
                return@launch
            }

            _errorMessage.value = null
            _isBusy.value = true
            _assistantState.value = AssistantState.THINKING
            _streamingReply.value = ""

            chatMessageDao.insertMessage(
                ChatMessageEntity(role = "user", content = text, provider = type.name.lowercase(), model = model)
            )

            val history = chatMessageDao.getAllMessages().first()
                .map { ChatMessage(role = it.role, content = it.content) }

            val reply = StringBuilder()
            var failed: String? = null

            try {
                providerFor(type)
                    .streamChat(history, model, apiKey, geminiConfig.defaultSystemPrompt, 0.7f, type.defaultBaseUrl)
                    .collect { result ->
                        when (result) {
                            is MituResult.Success -> {
                                reply.append(result.data)
                                _streamingReply.value = reply.toString()
                                _assistantState.value = AssistantState.SPEAKING
                            }
                            is MituResult.Error -> failed = result.message
                            MituResult.Loading -> {}
                        }
                    }
            } catch (e: Exception) {
                failed = e.message ?: "Streaming failed"
            } finally {
                if (reply.isNotBlank()) {
                    chatMessageDao.insertMessage(
                        ChatMessageEntity(
                            role = "assistant",
                            content = reply.toString(),
                            provider = type.name.lowercase(),
                            model = model
                        )
                    )
                }
                _streamingReply.value = ""
                _isBusy.value = false
                failed?.let { _errorMessage.value = it }
                _assistantState.value =
                    if (failed != null) AssistantState.ERROR else AssistantState.STANDBY
            }
        }
    }

    fun stopStreaming() {
        streamJob?.cancel()
        streamJob = null
        _isBusy.value = false
        _streamingReply.value = ""
        _assistantState.value = AssistantState.INTERRUPTED
    }

    fun clearChat() {
        viewModelScope.launch { chatMessageDao.clearHistory() }
    }

    private fun hasKey(type: ProviderType): Boolean =
        !secureKeyStore.getApiKey(type.name).isNullOrBlank()

    private fun apiKeyFor(type: ProviderType): String =
        secureKeyStore.getApiKey(type.name).orEmpty()

    private fun providerFor(type: ProviderType) =
        if (type == ProviderType.GEMINI) geminiProvider else openAiCompatibleProvider
}
