package com.mitu.assistant.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.Terminal
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.mitu.assistant.domain.models.AssistantState
import com.mitu.assistant.ui.components.MascotOrb
import com.mitu.assistant.ui.theme.MituSuccess

@Composable
fun HomeScreen(
    state: AssistantState,
    connectedModel: String,
    onStartCalling: () -> Unit,
    onActionClicked: (String) -> Unit
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp, vertical = 16.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // 1. Collapsing Large Title "Mitu"
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp)
        ) {
            Text(
                text = "Mitu",
                style = MaterialTheme.typography.displayLarge,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(
                text = "Voice AI Companion",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
            )
        }

        // 2. Centered Mascot Orb (~40% of screen) with ambient glow and subhead status
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(vertical = 32.dp)
        ) {
            MascotOrb(
                state = state,
                size = 176.dp,
                onClick = onStartCalling
            )

            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = when (state) {
                    AssistantState.STANDBY -> "Ready to assist"
                    AssistantState.LISTENING -> "Listening to your voice..."
                    AssistantState.THINKING -> "Thinking..."
                    AssistantState.SPEAKING -> "Speaking..."
                    AssistantState.INTERRUPTED -> "Interrupted"
                    AssistantState.ERROR -> "Connection issue"
                    else -> "Ready"
                },
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onBackground
            )

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center,
                modifier = Modifier.padding(top = 4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(MituSuccess)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "Connected to $connectedModel",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
                )
            }
        }

        // 3. Quick Actions row of tonal pills
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = "SUGGESTIONS",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                TonalActionPill("Take a note", Icons.Rounded.Description) {
                    onActionClicked("Mitu, note bana do: Weekly priorities and tasks")
                }
                TonalActionPill("Explain in Hinglish", Icons.Rounded.Psychology) {
                    onActionClicked("Explain how transformers work in simple Hinglish")
                }
                TonalActionPill("Git status", Icons.Rounded.Terminal) {
                    onActionClicked("Termux: check git status in workspace")
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 4. Primary 72dp Circular Accent Action Button (Start Calling)
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(bottom = 12.dp)
        ) {
            Button(
                onClick = onStartCalling,
                shape = CircleShape,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary
                ),
                modifier = Modifier.size(72.dp),
                contentPadding = PaddingValues(0.dp)
            ) {
                Icon(
                    imageVector = Icons.Rounded.Call,
                    contentDescription = "Start Calling Mode",
                    modifier = Modifier.size(30.dp),
                    tint = Color.White
                )
            }
            Text(
                text = "Tap to Call",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f),
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}

@Composable
fun TonalActionPill(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = CircleShape,
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onBackground
            )
        }
    }
}
