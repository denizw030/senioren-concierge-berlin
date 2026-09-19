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
internal fun CustomerSharedHistorySurface(
    onSessionExpired: () -> Unit,
    channel: String
) {
    val context = LocalContext.current
    val api = remember { CustomerHistoryApi(context) }
    var messages by remember(channel) { mutableStateOf<List<CustomerHistoryMessage>>(emptyList()) }
    var loading by remember(channel) { mutableStateOf(true) }
    var error by remember(channel) { mutableStateOf<String?>(null) }

    suspend fun refresh() {
        val normalized = channel.uppercase()
        when (normalized) {
            "CHAT" -> {
                api.loadThreads()
                    .onSuccess { threads ->
                        val thread = threads.firstOrNull { it.channels.any { ch -> ch == "WEB" || ch == "APP" } }
                        if (thread == null) {
                            messages = emptyList()
                            error = null
                            loading = false
                            return@onSuccess
                        }
                        api.loadMessages(thread.id)
                            .onSuccess {
                                messages = it.filter { item -> item.channel == "WEB" || item.channel == "APP" }
                                error = null
                                loading = false
                            }
                            .onFailure {
                                loading = false
                                if (it is CustomerHistorySessionExpiredException) onSessionExpired()
                                else error = it.message ?: "Chat konnte nicht geladen werden."
                            }
                    }
                    .onFailure {
                        loading = false
                        if (it is CustomerHistorySessionExpiredException) onSessionExpired()
                        else error = it.message ?: "Chat konnte nicht geladen werden."
                    }
            }
            "WHATSAPP", "PHONE", "EMAIL" -> {
                api.loadChannel(normalized)
                    .onSuccess {
                        messages = it.messages
                        error = null
                        loading = false
                    }
                    .onFailure {
                        loading = false
                        if (it is CustomerHistorySessionExpiredException) onSessionExpired()
                        else error = it.message ?: "Protokoll konnte nicht geladen werden."
                    }
            }
            else -> {
                messages = emptyList()
                error = "Dieser Chat-Kanal ist nicht verfügbar."
                loading = false
            }
        }
    }

    LaunchedEffect(channel) {
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
            Text(
                when (channel.uppercase()) {
                    "WHATSAPP" -> "WHATSAPP-PROTOKOLL"
                    "PHONE" -> "ANRUFPROTOKOLL"
                    "EMAIL" -> "E-MAIL-PROTOKOLL"
                    else -> "CHAT"
                },
                color = NahwerkPalette.Gold,
                style = MaterialTheme.typography.labelSmall
            )
            Text(
                when (channel.uppercase()) {
                    "WHATSAPP" -> "Nur lesen · Antworten direkt in WhatsApp"
                    "PHONE" -> "Nur lesen · Gespräche mit deinem Concierge"
                    "EMAIL" -> "Nur lesen · E-Mail-Austausch mit deinem persönlichen Concierge"
                    else -> "Web · App"
                },
                style = MaterialTheme.typography.titleMedium
            )

            when {
                loading && messages.isEmpty() -> Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                    CircularProgressIndicator(strokeWidth = 2.dp)
                    Text("Verlauf wird geladen.", color = NahwerkPalette.SecondaryText)
                }
                error != null && messages.isEmpty() ->
                    Text(requireNotNull(error), color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
                messages.isEmpty() ->
                    Text(
                        when (channel.uppercase()) {
                            "WHATSAPP" -> "Noch keine WhatsApp-Nachrichten."
                            "PHONE" -> "Noch kein Gesprächstranskript verfügbar."
                            "EMAIL" -> "Noch keine E-Mail-Nachrichten."
                            else -> "Noch keine Nachrichten."
                        },
                        color = NahwerkPalette.SecondaryText
                    )
                else -> messages.takeLast(60).forEach { item ->
                    val sender = if (item.role == "assistant") "NAHWERK" else "Du"
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(sender, color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                        Text(item.text, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }

            if (error != null && messages.isNotEmpty()) {
                Text(requireNotNull(error), color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
