package com.mitu.assistant.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.mitu.assistant.domain.models.ProviderType
import com.mitu.assistant.ui.theme.MituSuccess
import com.mitu.assistant.ui.theme.MituWarning
import com.mitu.assistant.ui.viewmodel.AssistantViewModel

/**
 * SettingsScreen: the Settings tab's real content — provider selection, model override and the
 * API key saved into EncryptedSharedPreferences. Values persist through SettingsStore.
 */
@Composable
fun SettingsScreen(viewModel: AssistantViewModel, modifier: Modifier = Modifier) {
    val providerType by viewModel.providerType.collectAsState()
    val model by viewModel.model.collectAsState()
    val keyStatus by viewModel.keyTestStatus.collectAsState()
    val savedKeys by viewModel.savedKeyProviders.collectAsState()

    var keyDraft by remember { mutableStateOf("") }
    var confirmClear by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Settings",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground
        )

        SettingsSection("Model Provider") {
            ProviderType.entries.forEach { type ->
                val implemented = viewModel.isImplemented(type)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(enabled = implemented) { viewModel.selectProvider(type) }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    RadioButton(
                        selected = type == providerType,
                        onClick = { if (implemented) viewModel.selectProvider(type) },
                        enabled = implemented
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = type.displayName,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            text = type.defaultBaseUrl,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.55f)
                        )
                        if (!implemented) {
                            Text(
                                text = "Not wired in this module yet — use the web app for it",
                                style = MaterialTheme.typography.labelSmall,
                                color = MituWarning
                            )
                        } else if (savedKeys.contains(type.name)) {
                            Text(
                                text = "API key stored",
                                style = MaterialTheme.typography.labelSmall,
                                color = MituSuccess
                            )
                        }
                    }
                }
            }
        }

        SettingsSection("Model") {
            OutlinedTextField(
                value = model,
                onValueChange = { viewModel.setModel(it) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Active model") },
                singleLine = true
            )
            Text(
                text = "Sent with every request; switching provider above resets it to that provider's default.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.55f),
                modifier = Modifier.padding(top = 6.dp)
            )
        }

        SettingsSection("API Key") {
            OutlinedTextField(
                value = keyDraft,
                onValueChange = { keyDraft = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("${providerType.displayName} API key") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation()
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Button(onClick = { viewModel.saveApiKey(keyDraft); keyDraft = "" }) {
                    Text("Save")
                }
                OutlinedButton(onClick = { viewModel.testCurrentKey() }) {
                    Text("Test key")
                }
            }
            keyStatus?.let { status ->
                Text(
                    text = status,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.70f),
                    modifier = Modifier.padding(top = 8.dp)
                )
            }
            Text(
                text = "Keys live in EncryptedSharedPreferences (AES256-GCM) and are redacted from logs.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.55f),
                modifier = Modifier.padding(top = 6.dp)
            )
        }

        SettingsSection("Privacy") {
            OutlinedButton(
                onClick = {
                    if (confirmClear) {
                        viewModel.clearStoredKeys()
                        confirmClear = false
                    } else {
                        confirmClear = true
                    }
                }
            ) {
                Text(if (confirmClear) "Tap again to erase all stored keys" else "Clear stored keys")
            }
        }
    }
}

@Composable
private fun SettingsSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = title.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f)
            )
            content()
        }
    }
}
