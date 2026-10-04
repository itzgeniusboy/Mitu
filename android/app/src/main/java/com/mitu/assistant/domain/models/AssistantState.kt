package com.mitu.assistant.domain.models

/**
 * AssistantState: Unified state machine representing the lifecycle
 * of MITU's mascot and voice/conversation loop.
 */
enum class AssistantState(val label: String) {
    STANDBY("Ready"),
    LISTENING("Listening..."),
    THINKING("Thinking..."),
    SPEAKING("Speaking..."),
    INTERRUPTED("Interrupted"),
    ERROR("Connection Error"),
    SLEEPY("Standby"),
    DIZZY("Whoa!"),
    WAVING("Namaste!")
}
