package com.nahwerk.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.nahwerk.concierge.data.CustomerEmailApi
import com.nahwerk.concierge.data.CustomerEmailConnection
import com.nahwerk.concierge.data.CustomerEmailSessionExpiredException
import com.nahwerk.concierge.data.CustomerEmailStatus

@Composable
internal fun CustomerEmailStatusSurface(onSessionExpired: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val api = remember { CustomerEmailApi(context) }
    var status by remember { mutableStateOf<CustomerEmailStatus?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        api.loadConnections()
            .onSuccess { status = it }
            .onFailure {
                if (it is CustomerEmailSessionExpiredException) onSessionExpired()
                else error = "Dein E-Mail-Status konnte gerade nicht geladen werden."
            }
        loading = false
    }

    if (loading) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically
        ) {
            CircularProgressIndicator(strokeWidth = 2.dp)
            Text("E-Mail-Verbindungen werden geladen.", color = NahwerkPalette.SecondaryText)
        }
    }

    error?.let { message ->
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = NahwerkPalette.ElevatedSurface),
            border = BorderStroke(1.dp, NahwerkPalette.Warning)
        ) {
            Column(Modifier.fillMaxWidth().padding(NahwerkSpacing.Lg)) {
                Text("E-Mail", style = MaterialTheme.typography.titleMedium)
                Text(message, color = NahwerkPalette.SecondaryText)
            }
        }
    }

    status?.let { snapshot ->
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(NahwerkRadii.Large),
            colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
            border = BorderStroke(1.dp, NahwerkPalette.Divider)
        ) {
            Column(
                Modifier.fillMaxWidth().padding(NahwerkSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
            ) {
                Text("E-MAIL", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                Text(
                    if (snapshot.connectedCount > 0) "${snapshot.connectedCount} E-Mail-Konto${if (snapshot.connectedCount == 1) "" else "en"} verbunden"
                    else "Noch kein E-Mail-Konto verbunden",
                    style = MaterialTheme.typography.titleLarge
                )
                if (snapshot.connections.isEmpty()) {
                    Text(
                        "Sobald du ein E-Mail-Konto verbindest, erscheint der bestätigte Verbindungsstatus hier automatisch.",
                        color = NahwerkPalette.SecondaryText
                    )
                } else {
                    snapshot.connections.forEach { EmailConnectionRow(it) }
                }
            }
        }
    }
}

@Composable
private fun EmailConnectionRow(connection: CustomerEmailConnection) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.ElevatedSurface),
        border = BorderStroke(1.dp, NahwerkPalette.Divider)
    ) {
        Column(
            Modifier.fillMaxWidth().padding(NahwerkSpacing.Md),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)
        ) {
            Text(connection.providerLabel, style = MaterialTheme.typography.titleMedium)
            connection.accountDisplayHint?.let {
                Text(it, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
            }
            Text(
                emailConnectionStateLabel(connection),
                color = if (connection.state == "CONNECTED") NahwerkPalette.Success else NahwerkPalette.Warning,
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

private fun emailConnectionStateLabel(connection: CustomerEmailConnection): String = when {
    connection.state == "CONNECTED" && connection.conciergeAvailable -> "Verbunden · E-Mail-Concierge verfügbar"
    connection.reauthRequired || connection.state == "REAUTH_REQUIRED" -> "Erneute Verbindung erforderlich"
    connection.state == "CONNECTING" -> "Verbindung wird eingerichtet"
    connection.state == "DISCONNECTED" -> "Nicht verbunden"
    else -> "Verbindung prüfen"
}
