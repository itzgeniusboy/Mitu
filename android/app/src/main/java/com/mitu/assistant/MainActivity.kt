package com.mitu.assistant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.ChatBubble
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.mitu.assistant.domain.models.AssistantState
import com.mitu.assistant.ui.screens.HomeScreen
import com.mitu.assistant.ui.theme.MituTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            MituTheme {
                val navController = rememberNavController()
                var currentTab by remember { mutableStateOf("home") }
                val assistantState by remember { mutableStateOf(AssistantState.STANDBY) }

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
                    when (currentTab) {
                        "home" -> HomeScreen(
                            state = assistantState,
                            connectedModel = "gemini-3.8-flash",
                            onStartCalling = { /* Trigger Calling Mode session */ },
                            onActionClicked = { currentTab = "chat" }
                        )
                        "chat" -> {
                            // Chat Screen tab
                        }
                        "settings" -> {
                            // Settings Screen tab
                        }
                    }
                }
            }
        }
    }
}
