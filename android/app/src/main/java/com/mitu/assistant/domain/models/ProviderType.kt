package com.mitu.assistant.domain.models

enum class ProviderType(val displayName: String, val defaultBaseUrl: String) {
    GEMINI("Google Gemini", "https://generativelanguage.googleapis.com"),
    GROQ("Groq", "https://api.groq.com/openai/v1"),
    OPENROUTER("OpenRouter", "https://openrouter.ai/api/v1"),
    OPENAI("OpenAI", "https://api.openai.com/v1"),
    ANTHROPIC("Anthropic", "https://api.anthropic.com/v1"),
    LOCAL_OLLAMA("Local Ollama", "http://localhost:11434/v1")
}
