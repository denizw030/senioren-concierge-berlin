package com.nahwerk.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.nahwerk.concierge.data.AppCoreReply
import com.nahwerk.concierge.data.AppGatewayApi
import com.nahwerk.concierge.data.AppGatewaySessionExpiredException
import com.nahwerk.concierge.data.AppHomeSnapshot
import com.nahwerk.concierge.data.AppIntelligenceMode
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val ReminderInputFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")

internal fun reminderInputToIso(value: String, now: java.time.Instant = java.time.Instant.now()): String? = runCatching {
    val instant = LocalDateTime.parse(value.trim(), ReminderInputFormatter)
        .atZone(ZoneId.of("Europe/Berlin"))
        .toInstant()
    instant.takeIf { it.isAfter(now) }?.toString()
}.getOrNull()

@Composable
internal fun AppProdGatewaySurface(onSessionExpired: () -> Unit) {
    val context = LocalContext.current
    val api = remember { AppGatewayApi(context) }
    val scope = rememberCoroutineScope()
    var home by remember { mutableStateOf<AppHomeSnapshot?>(null) }
    var loadingHome by remember { mutableStateOf(true) }
    var homeError by remember { mutableStateOf<String?>(null) }
    var intelligenceMode by remember { mutableStateOf<AppIntelligenceMode?>(null) }
    var modeBusy by remember { mutableStateOf(false) }
    var modeError by remember { mutableStateOf<String?>(null) }
    var showSmartConfirm by remember { mutableStateOf(false) }
    var message by rememberSaveable { mutableStateOf("") }
    var conciergeBusy by remember { mutableStateOf(false) }
    var conciergeReply by remember { mutableStateOf<AppCoreReply?>(null) }
    var conciergeError by remember { mutableStateOf<String?>(null) }
    var reminderText by rememberSaveable { mutableStateOf("") }
    var reminderAt by rememberSaveable { mutableStateOf("") }
    var reminderBusy by remember { mutableStateOf(false) }
    var reminderResult by remember { mutableStateOf<String?>(null) }
    var reminderError by remember { mutableStateOf<String?>(null) }

    fun handleFailure(error: Throwable?, target: (String?) -> Unit) {
        if (error is AppGatewaySessionExpiredException) {
            onSessionExpired()
        } else {
            target(error?.message ?: "PROD-Anfrage fehlgeschlagen.")
        }
    }

    fun refreshIntelligenceMode() {
        modeError = null
        scope.launch {
            api.loadIntelligenceMode()
                .onSuccess { intelligenceMode = it }
                .onFailure { handleFailure(it) { text -> modeError = text } }
        }
    }

    fun refreshHome() {
        loadingHome = true
        homeError = null
        scope.launch {
            val result = api.loadHome()
            loadingHome = false
            result.onSuccess {
                home = it
                refreshIntelligenceMode()
            }.onFailure { handleFailure(it) { text -> homeError = text } }
        }
    }

    fun setMode(mode: String, acknowledgeHigherConsumption: Boolean) {
        if (modeBusy) return
        modeBusy = true
        modeError = null
        scope.launch {
            val result = api.setIntelligenceMode(mode, acknowledgeHigherConsumption)
            modeBusy = false
            result.onSuccess {
                intelligenceMode = it
                home = home?.copy(intelligenceMode = it.mode)
            }.onFailure { handleFailure(it) { text -> modeError = text } }
        }
    }

    LaunchedEffect(Unit) {
        val result = api.loadHome()
        loadingHome = false
        result.onSuccess {
            home = it
            api.loadIntelligenceMode()
                .onSuccess { mode -> intelligenceMode = mode }
                .onFailure { failure -> handleFailure(failure) { text -> modeError = text } }
        }.onFailure { handleFailure(it) { text -> homeError = text } }
    }

    if (showSmartConfirm) {
        AlertDialog(
            onDismissRequest = { if (!modeBusy) showSmartConfirm = false },
            title = { Text("Intelligenten Modus aktivieren?") },
            text = {
                Text(
                    intelligenceMode?.smartNotice
                        ?: "Der intelligente Modus versteht freie Formulierungen und Kontext, nutzt dafür mehr KI und kann dein Guthaben deutlich schneller verbrauchen. Der genaue Preisaufschlag wird erst nach realer Kostenkalibrierung festgelegt."
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSmartConfirm = false
                        setMode("SMART", acknowledgeHigherConsumption = true)
                    },
                    enabled = !modeBusy
                ) { Text("Ja, intelligent aktivieren") }
            },
            dismissButton = {
                TextButton(onClick = { showSmartConfirm = false }, enabled = !modeBusy) { Text("Abbrechen") }
            }
        )
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
            Text("STARTSEITE · PROD", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
            when {
                loadingHome -> Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                    CircularProgressIndicator(strokeWidth = 2.dp)
                    Text("Echte Kontodaten werden geladen.")
                }
                homeError != null -> {
                    Text(requireNotNull(homeError), color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
                    OutlinedButton(onClick = ::refreshHome) { Text("Erneut laden") }
                }
                home != null -> {
                    val snapshot = requireNotNull(home)
                    Text("PROD verbunden", style = MaterialTheme.typography.titleMedium)
                    Text(
                        if (snapshot.activeTaskId == null) "Kein aktiver Auftrag." else "Aktiver Auftrag: ${snapshot.activeTaskStatus ?: "offen"}",
                        color = NahwerkPalette.SecondaryText
                    )
                    Text(
                        "Concierge-Modus: ${if ((intelligenceMode?.mode ?: snapshot.intelligenceMode) == "SMART") "Intelligent" else "Günstig"}",
                        color = NahwerkPalette.SecondaryText
                    )
                    Text("Aktive Erinnerungen: ${snapshot.reminderCountActive}", color = NahwerkPalette.SecondaryText)
                    if (snapshot.pendingApproval) Text("Eine Freigabe wartet auf deine Antwort.", color = NahwerkPalette.Warning)
                    snapshot.reminders.take(3).forEach { item ->
                        Text("• ${item.text} · ${item.remindAt}", style = MaterialTheme.typography.bodySmall)
                    }
                    OutlinedButton(onClick = ::refreshHome) { Text("Aktualisieren") }
                }
            }
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
            Text("CONCIERGE-MODUS", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
            val effectiveMode = intelligenceMode?.mode ?: home?.intelligenceMode ?: "ECONOMY"
            Text(
                if (effectiveMode == "SMART") "Intelligenter Modus" else "Günstiger Modus",
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                if (effectiveMode == "SMART") {
                    intelligenceMode?.smartNotice
                        ?: "Freie Formulierungen und Kontext werden intelligent verstanden. Dafür wird mehr KI verwendet."
                } else {
                    intelligenceMode?.economyNotice
                        ?: "Klare Abläufe und Befehle werden möglichst ohne laufende KI-Interpretation verarbeitet. KI wird nur genutzt, wenn die Leistung selbst sie benötigt."
                },
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.bodySmall
            )
            if (intelligenceMode?.pricingStatus == "CALIBRATION_PENDING" || intelligenceMode == null) {
                Text(
                    "Der genaue Aufpreis für den intelligenten Modus wird erst nach realer Kostenkalibrierung festgelegt.",
                    color = NahwerkPalette.SecondaryText,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                Button(
                    onClick = { setMode("ECONOMY", acknowledgeHigherConsumption = false) },
                    enabled = !modeBusy && effectiveMode != "ECONOMY"
                ) { Text("Günstig") }
                OutlinedButton(
                    onClick = { showSmartConfirm = true },
                    enabled = !modeBusy && effectiveMode != "SMART"
                ) { Text("Intelligent") }
            }
            if (modeBusy) Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                CircularProgressIndicator(strokeWidth = 2.dp)
                Text("Modus wird sicher gespeichert.", color = NahwerkPalette.SecondaryText)
            }
            modeError?.let { Text(it, color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall) }
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
            Text("CONCIERGE · PROD", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
            OutlinedTextField(
                value = message,
                onValueChange = { message = it.take(5000) },
                label = { Text("Was soll NAHWERK erledigen?") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                enabled = !conciergeBusy
            )
            Button(
                onClick = {
                    conciergeBusy = true
                    conciergeError = null
                    conciergeReply = null
                    scope.launch {
                        val result = api.sendConcierge(message)
                        conciergeBusy = false
                        result.onSuccess {
                            conciergeReply = it
                            message = ""
                            refreshHome()
                        }.onFailure { handleFailure(it) { text -> conciergeError = text } }
                    }
                },
                enabled = !conciergeBusy && message.isNotBlank(),
                modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch)
            ) {
                if (conciergeBusy) CircularProgressIndicator(strokeWidth = 2.dp) else Text("An Concierge senden")
            }
            conciergeReply?.let {
                Text(it.message, style = MaterialTheme.typography.bodyMedium)
                Text("Status: ${it.responseState}", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
            }
            conciergeError?.let { Text(it, color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall) }
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
            Text("ERINNERUNGEN · PROD", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
            OutlinedTextField(
                value = reminderText,
                onValueChange = { reminderText = it.take(1000) },
                label = { Text("Woran soll ich dich erinnern?") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !reminderBusy
            )
            OutlinedTextField(
                value = reminderAt,
                onValueChange = { reminderAt = it.take(16) },
                label = { Text("Zeitpunkt: JJJJ-MM-TT HH:MM") },
                modifier = Modifier.fillMaxWidth(),
                enabled = !reminderBusy,
                singleLine = true
            )
            Button(
                onClick = {
                    val iso = reminderInputToIso(reminderAt)
                    if (iso == null) {
                        reminderError = "Bitte einen zukünftigen Zeitpunkt im Format JJJJ-MM-TT HH:MM eingeben."
                        return@Button
                    }
                    reminderBusy = true
                    reminderError = null
                    reminderResult = null
                    scope.launch {
                        val result = api.createReminder(reminderText, iso)
                        reminderBusy = false
                        result.onSuccess {
                            reminderResult = it.message
                            reminderText = ""
                            reminderAt = ""
                            refreshHome()
                        }.onFailure { handleFailure(it) { text -> reminderError = text } }
                    }
                },
                enabled = !reminderBusy && reminderText.isNotBlank() && reminderAt.isNotBlank(),
                modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch)
            ) {
                if (reminderBusy) CircularProgressIndicator(strokeWidth = 2.dp) else Text("Erinnerung erstellen")
            }
            reminderResult?.let { Text(it, color = NahwerkPalette.SecondaryText) }
            reminderError?.let { Text(it, color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall) }
        }
    }
}
