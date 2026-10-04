package com.mitu.assistant.data.room

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable

@Entity(tableName = "chat_messages")
@Serializable
data class ChatMessageEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val role: String, // "user", "assistant", "system"
    val content: String,
    val provider: String = "gemini",
    val model: String = "gemini-3.8-flash",
    val timestamp: Long = System.currentTimeMillis()
)
