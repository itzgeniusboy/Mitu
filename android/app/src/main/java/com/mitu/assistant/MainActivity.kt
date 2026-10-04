package com.mitu.assistant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ChatBubble
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.mitu.assistant.ui.screens.ChatScreen
import com.mitu.assistant.ui.screens.HomeScreen
import com.mitu.assistant.ui.screens.SettingsScreen
import com.mitu.assistant.ui.theme.MituTheme
import com.mitu.assistant.ui.viewmodel.AssistantViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MituTheme {
                val viewModel: AssistantViewModel by viewModels()

                var currentTab by remember { mutableStateOf("home") }

                // Real state machine from the ViewModel (was a `remember` no one ever wrote to, so
                // the mascot stayed frozen on STANDBY).
                val assistantState by viewModel.assistantState.collectAsState()
                val connectedModel by viewModel.model.collectAsState()

                Scaffold(
                    bottomBar = {
                        NavigationBar(
                            containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.85f),
                            contentColor = MaterialTheme.colorScheme.onSurface
                        ) {
                            NavigationBarItem(
                                selected = currentTab == "home",
                                onClick = { currentTab = "home" },
                                icon = { Icon(Icons.Rounded.Home, contentDescription = "Home") },
                                label = { Text("Home") }
                            )
                            NavigationBarItem(
                                selected = currentTab == "chat",
                                onClick = { currentTab = "chat" },
                                icon = { Icon(Icons.Rounded.ChatBubble, contentDescription = "Chat") },
                                label = { Text("Chat") }
                            )
                            NavigationBarItem(
                                selected = currentTab == "settings",
                                onClick = { currentTab = "settings" },
                                icon = { Icon(Icons.Rounded.Settings, contentDescription = "Settings") },
                                label = { Text("Settings") }
                            )
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                ) { innerPadding ->
                    Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
                    when (currentTab) {
                        "chat" -> ChatScreen(viewModel)
                        "settings" -> SettingsScreen(viewModel)
                        else -> HomeScreen(
                            state = assistantState,
                            connectedModel = connectedModel,
                            onStartCalling = {
                                // Calling mode (Gemini Live + AudioRecord/AudioTrack loop) is not
                                // implemented in this module yet, so this stays an explicit no-op
                                // instead of pretending to start a session.
                            },
                            onActionClicked = { prompt ->
                                currentTab = "chat"
                                viewModel.send(prompt)
                            }
                        )
                    }
                    }
                }
            }
        }
    }
}
