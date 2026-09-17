package com.nahwerk.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.nahwerk.concierge.data.CustomerHistoryApi
import com.nahwerk.concierge.data.CustomerHistoryMessage
import com.nahwerk.concierge.data.CustomerHistorySessionExpiredException
import kotlinx.coroutines.delay

@Composable
internal fun CustomerSharedHistorySurface(onSessionExpired: () -> Unit) {
    val context = LocalContext.current
    val api = remember { CustomerHistoryApi(context) }
    var messages by remember { mutableStateOf<List<CustomerHistoryMessage>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    suspend fun refresh() {
        api.loadThreads()
            .onSuccess { threads ->
                val thread = threads.firstOrNull()
                if (thread == null) {
                    messages = emptyList()
                    error = null
                    loading = false
                    return@onSuccess
                }
                api.loadMessages(thread.id)
                    .onSuccess {
                        messages = it
                        error = null
                        loading = false
                    }
                    .onFailure {
                        loading = false
                        if (it is CustomerHistorySessionExpiredException) onSessionExpired()
                        else error = it.message ?: "Hauptverlauf konnte nicht geladen werden."
                    }
            }
            .onFailure {
                loading = false
                if (it is CustomerHistorySessionExpiredException) onSessionExpired()
                else error = it.message ?: "Hauptverlauf konnte nicht geladen werden."
            }
    }

    LaunchedEffect(Unit) {
        while (true) {
            refresh()
            delay(5_000)
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
        border = BorderStroke(1.dp, NahwerkPalette.Divider)
    ) {
        Column(
            Modifier.fillMaxWidth().padding(NahwerkSpacing.Lg),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
        ) {
            Text("HAUPT-CHAT", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
            Text("Web · App · WhatsApp", style = MaterialTheme.typography.titleMedium)
            Text(
                "WhatsApp-Unterhaltungen erscheinen hier automatisch. Nachrichten aus der App oder dem Web werden nicht zusätzlich an WhatsApp versendet.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.bodySmall
            )

            when {
                loading && messages.isEmpty() -> Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                    CircularProgressIndicator(strokeWidth = 2.dp)
                    Text("Verlauf wird geladen.", color = NahwerkPalette.SecondaryText)
                }
                error != null && messages.isEmpty() -> Text(requireNotNull(error), color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
                messages.isEmpty() -> Text("Noch keine Nachrichten im gemeinsamen Verlauf.", color = NahwerkPalette.SecondaryText)
                else -> messages.takeLast(40).forEach { item ->
                    val channel = when (item.channel) {
                        "WHATSAPP" -> "WhatsApp"
                        "WEB" -> "Web"
                        "APP" -> "App"
                        else -> item.channel.ifBlank { "Concierge" }
                    }
                    val sender = if (item.role == "assistant") "NAHWERK · $channel" else "Du · $channel"
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(sender, color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                        Text(item.text, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }

            if (error != null && messages.isNotEmpty()) {
                Text(requireNotNull(error), color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
            }
            OutlinedButton(onClick = { loading = true }) { Text("Automatische Aktualisierung aktiv") }
        }
    }
}
