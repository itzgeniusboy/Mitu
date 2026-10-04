package com.mitu.assistant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material.icons.rounded.Stop
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.mitu.assistant.R
import com.mitu.assistant.data.room.ChatMessageEntity
import com.mitu.assistant.ui.viewmodel.AssistantViewModel

/**
 * ChatScreen: reads and writes the real Room history (ChatMessageDao) and streams the model's
 * reply live. It used to be an empty `when` branch behind the Chat tab.
 */
@Composable
fun ChatScreen(viewModel: AssistantViewModel, modifier: Modifier = Modifier) {
    val messages by viewModel.messages.collectAsState()
    val streaming by viewModel.streamingReply.collectAsState()
    val busy by viewModel.isBusy.collectAsState()
    val error by viewModel.errorMessage.collectAsState()
    val providerType by viewModel.providerType.collectAsState()
    val model by viewModel.model.collectAsState()
    var draft by remember { mutableStateOf("") }

    val submit = {
        val text = draft
        draft = ""
        viewModel.send(text)
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Chat",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "${providerType.displayName} · $model",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.55f)
            )
        }

        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(top = 4.dp, bottom = 12.dp)
        ) {
            items(items = messages, key = { it.id }) { message ->
                ChatBubble(message = message)
            }
            if (streaming.isNotBlank()) {
                item(key = "streaming") {
                    ChatBubble(
                        message = ChatMessageEntity(
                            id = -1L,
                            role = "assistant",
                            content = streaming,
                            provider = providerType.name.lowercase(),
                            model = model
                        ),
                        isStreaming = true
                    )
                }
            }
        }

        error?.let { message ->
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp)
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedTextField(
                value = draft,
                onValueChange = { draft = it },
                modifier = Modifier.weight(1f),
                label = { Text(stringResource(R.string.chat_hint)) },
                shape = RoundedCornerShape(22.dp),
                maxLines = 4,
                enabled = !busy,
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Text,
                    imeAction = ImeAction.Send
                ),
                keyboardActions = KeyboardActions(onSend = { submit() })
            )

            if (busy) {
                FilledIconButton(onClick = { viewModel.stopStreaming() }) {
                    Icon(Icons.Rounded.Stop, contentDescription = "Stop generating")
                }
            } else {
                FilledIconButton(onClick = { submit() }, enabled = draft.isNotBlank()) {
                    Icon(Icons.Rounded.Send, contentDescription = "Send message")
                }
            }
        }
    }
}

@Composable
private fun ChatBubble(message: ChatMessageEntity, isStreaming: Boolean = false) {
    val isUser = message.role == "user"
    val container = if (isUser) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surfaceVariant
    val content = if (isUser) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = container,
            tonalElevation = if (isStreaming) 2.dp else 0.dp,
            modifier = Modifier.widthIn(max = 320.dp)
        ) {
            Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (isUser) "You" else "Mitu",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = content.copy(alpha = 0.70f)
                    )
                    if (isStreaming) {
                        Text(
                            text = "streaming…",
                            style = MaterialTheme.typography.labelSmall,
                            color = content.copy(alpha = 0.55f)
                        )
                    } else {
                        Text(
                            text = message.model,
                            style = MaterialTheme.typography.labelSmall,
                            color = content.copy(alpha = 0.45f)
                        )
                    }
                }
                Text(
                    text = message.content,
                    style = MaterialTheme.typography.bodyMedium,
                    color = content,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }
}
