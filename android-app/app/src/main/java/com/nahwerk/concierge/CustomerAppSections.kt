package com.nahwerk.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.nahwerk.concierge.data.AppGatewayApi
import com.nahwerk.concierge.data.AppGatewaySessionExpiredException
import com.nahwerk.concierge.data.AppHomeSnapshot
import com.nahwerk.concierge.data.AppPersonaSnapshot
import com.nahwerk.concierge.data.CustomerProfile
import com.nahwerk.concierge.data.CustomerHistoryApi
import com.nahwerk.concierge.data.ProdCustomerApi
import com.nahwerk.concierge.data.SafetySnapshot
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

internal enum class CustomerSection {
    OVERVIEW,
    CONCIERGE,
    EMAIL,
    SAFETY,
    USAGE,
    PERSONAL,
    CONCIERGE_SETTINGS,
    SECURITY
}

@Composable
internal fun CustomerAppShell(onLogout: () -> Unit) {
    var section by rememberSaveable { mutableStateOf(CustomerSection.OVERVIEW) }

    Scaffold(
        containerColor = NahwerkPalette.Background,
        topBar = {
            Surface(color = NahwerkPalette.Surface, border = BorderStroke(1.dp, NahwerkPalette.Divider)) {
                Row(
                    Modifier.fillMaxWidth().safeDrawingPadding().padding(horizontal = NahwerkSpacing.Lg, vertical = NahwerkSpacing.Md),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("NAHWERK", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelLarge)
                        Text(customerSectionTitle(section), style = MaterialTheme.typography.titleMedium)
                    }
                }
            }
        }
    ) { padding ->
        Column(
            Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(NahwerkSpacing.Xl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)
        ) {
            CustomerMenu(selected = section, onSelect = { section = it })

            when (section) {
                CustomerSection.OVERVIEW -> CustomerOverviewSurface(
                    onSessionExpired = onLogout,
                    onOpenConcierge = { section = CustomerSection.CONCIERGE },
                    onOpenConciergeSettings = { section = CustomerSection.CONCIERGE_SETTINGS },
                    onOpenUsage = { section = CustomerSection.USAGE }
                )
                CustomerSection.CONCIERGE -> CustomerConciergeSurface(
                    onSessionExpired = onLogout,
                    onOpenConciergeSettings = { section = CustomerSection.CONCIERGE_SETTINGS },
                    onOpenUsage = { section = CustomerSection.USAGE }
                )
                CustomerSection.EMAIL -> CustomerEmailStatusSurface(onSessionExpired = onLogout)
                CustomerSection.SAFETY -> CustomerSafetySurface(onSessionExpired = onLogout)
                CustomerSection.USAGE -> CustomerUsageSurface(onSessionExpired = onLogout)
                CustomerSection.PERSONAL -> CustomerPersonalSurface(
                    onSessionExpired = onLogout,
                    onOpenSecurity = { section = CustomerSection.SECURITY },
                    onLogout = onLogout
                )
                CustomerSection.CONCIERGE_SETTINGS -> CustomerConciergeSettingsSurface(
                    onSessionExpired = onLogout,
                    onBack = { section = CustomerSection.OVERVIEW }
                )
                CustomerSection.SECURITY -> CustomerSecuritySurface(
                    onBack = { section = CustomerSection.PERSONAL }
                )
            }
        }
    }
}

@Composable
private fun CustomerMenu(selected: CustomerSection, onSelect: (CustomerSection) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().testTag("customer_menu"),
        shape = RoundedCornerShape(NahwerkRadii.Large),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
        border = BorderStroke(1.dp, NahwerkPalette.Divider)
    ) {
        Column(
            Modifier.fillMaxWidth().padding(NahwerkSpacing.Md),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)
        ) {
            CustomerMenuButton("Übersicht", CustomerSection.OVERVIEW, selected, onSelect)
            CustomerMenuButton("Concierge", CustomerSection.CONCIERGE, selected, onSelect)
            CustomerMenuButton("E-Mail", CustomerSection.EMAIL, selected, onSelect)
            CustomerMenuButton("Safety", CustomerSection.SAFETY, selected, onSelect)
            CustomerMenuButton("Nutzung", CustomerSection.USAGE, selected, onSelect)
            CustomerMenuButton("Persönliche Daten", CustomerSection.PERSONAL, selected, onSelect)
        }
    }
}

@Composable
private fun CustomerMenuButton(
    label: String,
    target: CustomerSection,
    selected: CustomerSection,
    onSelect: (CustomerSection) -> Unit
) {
    if (selected == target) {
        Button(onClick = { onSelect(target) }, modifier = Modifier.fillMaxWidth()) { Text(label) }
    } else {
        TextButton(onClick = { onSelect(target) }, modifier = Modifier.fillMaxWidth()) { Text(label) }
    }
}

@Composable
private fun CustomerOverviewSurface(
    onSessionExpired: () -> Unit,
    onOpenConcierge: () -> Unit,
    onOpenConciergeSettings: () -> Unit,
    onOpenUsage: () -> Unit
) {
    val context = LocalContext.current
    val appApi = remember { AppGatewayApi(context) }
    val productApi = remember { ProdCustomerApi(context) }
    var home by remember { mutableStateOf<AppHomeSnapshot?>(null) }
    var profile by remember { mutableStateOf<CustomerProfile?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        val homeResult = appApi.loadHome()
        val profileResult = productApi.loadProfile()
        loading = false
        homeResult.onSuccess { home = it }.onFailure {
            if (it is AppGatewaySessionExpiredException) onSessionExpired() else error = customerSafeError(it)
        }
        profileResult.onSuccess { profile = it }.onFailure {
            if (!productApi.hasSession()) onSessionExpired() else if (error == null) error = customerSafeError(it)
        }
    }

    if (loading) CustomerLoading("Deine Übersicht wird geladen.")
    error?.let { CustomerMessageCard("Verbindung", it, warning = true) }

    home?.let { snapshot ->
        ConciergeIdentityCard(snapshot.persona, onOpenConciergeSettings)
        CustomerSectionCard("ÜBERSICHT", "Was steht an?") {
            Text(
                if (snapshot.activeTaskId == null) "Aktuell ist kein Auftrag offen." else "Ein Concierge-Auftrag ist noch aktiv.",
                color = NahwerkPalette.SecondaryText
            )
            Text("Aktive Erinnerungen: ${snapshot.reminderCountActive}", color = NahwerkPalette.SecondaryText)
            if (snapshot.pendingApproval) Text("Eine Freigabe wartet auf deine Antwort.", color = NahwerkPalette.Warning)
            Button(onClick = onOpenConcierge, modifier = Modifier.fillMaxWidth()) { Text("Concierge öffnen") }
        }
    }

    profile?.let { p ->
        CustomerSectionCard("TARIF", p.planName.ifBlank { p.planCode.ifBlank { "Dein Tarif" } }) {
            Text("Deine Nutzung und Berechtigungen werden zentral aus deinem Kundenkonto übernommen.", color = NahwerkPalette.SecondaryText)
            OutlinedButton(onClick = onOpenUsage, modifier = Modifier.fillMaxWidth()) { Text("Nutzung ansehen") }
        }
    }
}

@Composable
private fun CustomerConciergeSurface(
    onSessionExpired: () -> Unit,
    onOpenConciergeSettings: () -> Unit,
    onOpenUsage: () -> Unit
) {
    val context = LocalContext.current
    val appApi = remember { AppGatewayApi(context) }
    val productApi = remember { ProdCustomerApi(context) }
    val historyApi = remember { CustomerHistoryApi(context) }
    val scope = rememberCoroutineScope()
    var home by remember { mutableStateOf<AppHomeSnapshot?>(null) }
    var profile by remember { mutableStateOf<CustomerProfile?>(null) }
    var draft by rememberSaveable { mutableStateOf("") }
    var reply by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var chatChannel by rememberSaveable { mutableStateOf("CHAT") }
    var phoneAvailable by remember { mutableStateOf(false) }
    var emailAvailable by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        appApi.loadHome().onSuccess { home = it }.onFailure {
            if (it is AppGatewaySessionExpiredException) onSessionExpired() else error = customerSafeError(it)
        }
        productApi.loadProfile().onSuccess { profile = it }.onFailure {
            if (!productApi.hasSession()) onSessionExpired()
        }
        historyApi.loadChannel("PHONE", summaryOnly = true).onSuccess {
            phoneAvailable = it.hasCalls
            if (!phoneAvailable && chatChannel == "PHONE") chatChannel = "CHAT"
        }
        historyApi.loadChannel("EMAIL", summaryOnly = true).onSuccess {
            emailAvailable = it.hasEmail
            if (!emailAvailable && chatChannel == "EMAIL") chatChannel = "CHAT"
        }
    }

    ConciergeIdentityCard(home?.persona, onOpenConciergeSettings)

    val appLimit = profile?.appDialogueLimit
    val appUsed = profile?.appDialoguesUsed
    val appLimitReached = appLimit != null && appUsed != null && appLimit >= 0 && appUsed >= appLimit

    CustomerSectionCard("CHAT-KANÄLE", "Chat · WhatsApp · Anrufprotokoll · E-Mail") {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)
        ) {
            if (chatChannel == "CHAT") {
                Button(onClick = { chatChannel = "CHAT" }) { Text("Chat") }
            } else {
                OutlinedButton(onClick = { chatChannel = "CHAT" }) { Text("Chat") }
            }
            if (chatChannel == "WHATSAPP") {
                Button(onClick = { chatChannel = "WHATSAPP" }) { Text("WhatsApp") }
            } else {
                OutlinedButton(onClick = { chatChannel = "WHATSAPP" }) { Text("WhatsApp") }
            }
            if (phoneAvailable) {
                if (chatChannel == "PHONE") {
                    Button(onClick = { chatChannel = "PHONE" }) { Text("Anrufprotokoll") }
                } else {
                    OutlinedButton(onClick = { chatChannel = "PHONE" }) { Text("Anrufprotokoll") }
                }
            }
            if (emailAvailable) {
                if (chatChannel == "EMAIL") {
                    Button(onClick = { chatChannel = "EMAIL" }) { Text("E-Mail") }
                } else {
                    OutlinedButton(onClick = { chatChannel = "EMAIL" }) { Text("E-Mail") }
                }
            }
        }
    }

    if (chatChannel == "CHAT") {
        if (appLimitReached) {
            CustomerMessageCard(
                title = "Dein App-Kontingent ist aufgebraucht",
                body = "Für den aktuellen Abrechnungszeitraum sind keine weiteren App-Nachrichten verfügbar. Unter Nutzung siehst du dein Kontingent und mögliche nächste Schritte.",
                warning = true
            )
            Button(onClick = onOpenUsage, modifier = Modifier.fillMaxWidth()) { Text("Nutzung & Upgrade ansehen") }
        } else {
            CustomerSectionCard("CONCIERGE", "Was soll ich für dich tun?") {
                OutlinedTextField(
                    value = draft,
                    onValueChange = { draft = it.take(5000) },
                    label = { Text("Nachricht") },
                    minLines = 3,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !busy
                )
                Button(
                    onClick = {
                        busy = true
                        reply = null
                        error = null
                        scope.launch {
                            appApi.sendConcierge(draft)
                                .onSuccess {
                                    reply = it.message
                                    draft = ""
                                }
                                .onFailure {
                                    if (it is AppGatewaySessionExpiredException) onSessionExpired()
                                    else error = customerSafeError(it)
                                }
                            busy = false
                        }
                    },
                    enabled = !busy && draft.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch).testTag("concierge_send")
                ) {
                    if (busy) CircularProgressIndicator(strokeWidth = 2.dp) else Text("Senden")
                }
                reply?.let { Text(it, style = MaterialTheme.typography.bodyMedium) }
                error?.let { Text(it, color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall) }
            }
        }
    } else {
        CustomerMessageCard(
            title = "Nur Protokoll",
            body = when (chatChannel) {
                "WHATSAPP" -> "Hier wird dein WhatsApp-Verlauf angezeigt. Antworten sind nur direkt in WhatsApp möglich."
                "EMAIL" -> "Hier wird dein E-Mail-Verlauf mit dem Concierge angezeigt. E-Mail-Antworten werden über den E-Mail-Concierge versendet."
                else -> "Hier wird das Gespräch mit deinem Concierge dokumentiert. In diesem Protokoll kann nicht geschrieben werden."
            }
        )
    }

    CustomerSharedHistorySurface(onSessionExpired = onSessionExpired, channel = chatChannel)
}

@Composable
private fun CustomerEmailSurface() {
    CustomerSectionCard("E-MAIL", "E-Mail mit NAHWERK") {
        Text(
            "Deine persönlichen E-Mail-Verbindungen und E-Mail-Verläufe werden nur nach Anmeldung deinem Kundenkonto zugeordnet.",
            color = NahwerkPalette.SecondaryText
        )
        Text(
            "Die Android-Ansicht für verbundene E-Mail-Konten wird an den zentralen E-Mail-Status angebunden; bis dahin zeigt die App keine erfundenen Verbindungszustände.",
            color = NahwerkPalette.SecondaryText,
            style = MaterialTheme.typography.bodySmall
        )
    }
}

@Composable
private fun CustomerSafetySurface(onSessionExpired: () -> Unit) {
    val context = LocalContext.current
    val api = remember { ProdCustomerApi(context) }
    var safety by remember { mutableStateOf<SafetySnapshot?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        api.loadSafety().onSuccess { safety = it }.onFailure {
            if (!api.hasSession()) onSessionExpired() else error = customerSafeError(it)
        }
        loading = false
    }

    if (loading) CustomerLoading("Safety wird geladen.")
    error?.let { CustomerMessageCard("Safety", it, warning = true) }
    safety?.let { state ->
        CustomerSectionCard("SAFETY", if (state.enabled) "Safety ist aktiviert" else "Safety ist nicht aktiviert") {
            if (state.checkinTimes.isNotEmpty()) {
                Text("Check-ins: ${state.checkinTimes.joinToString(" · ")}", color = NahwerkPalette.SecondaryText)
            } else {
                Text("Keine Check-in-Zeiten hinterlegt.", color = NahwerkPalette.SecondaryText)
            }
            if (state.contacts.isNotEmpty()) {
                Text("Hinterlegte Kontakte", style = MaterialTheme.typography.titleMedium)
                state.contacts.forEach { contact ->
                    Text(listOf(contact.name, contact.relationship).filter(String::isNotBlank).joinToString(" · "), color = NahwerkPalette.SecondaryText)
                }
            }
            Text("Änderungen werden ausschließlich über dein angemeldetes Kundenkonto gespeichert.", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun CustomerUsageSurface(onSessionExpired: () -> Unit) {
    val context = LocalContext.current
    val api = remember { ProdCustomerApi(context) }
    var profile by remember { mutableStateOf<CustomerProfile?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var showUpgrade by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        api.loadProfile().onSuccess { profile = it }.onFailure {
            if (!api.hasSession()) onSessionExpired() else error = customerSafeError(it)
        }
        loading = false
    }

    if (loading) CustomerLoading("Nutzung wird geladen.")
    error?.let { CustomerMessageCard("Nutzung", it, warning = true) }
    profile?.let { p ->
        val app = usageMetric(p.appDialoguesUsed, p.appDialogueLimit)
        val whatsapp = usageMetric(p.whatsappDialoguesUsed, p.whatsappDialogueLimit)
        val reached = app.reached || whatsapp.reached

        CustomerSectionCard("NUTZUNG", p.planName.ifBlank { p.planCode.ifBlank { "Dein Tarif" } }) {
            UsageRow("App", app)
            UsageRow("WhatsApp", whatsapp)
            Text(
                p.usagePeriodEnd?.takeIf(String::isNotBlank)?.let { "Erneuerung: ${formatUsageDate(it)}" }
                    ?: "Der nächste Erneuerungszeitpunkt wird angezeigt, sobald er zentral bereitsteht.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.bodySmall
            )
        }

        if (reached) {
            CustomerMessageCard(
                "Kontingent erreicht",
                "Mindestens ein Kontingent deines aktuellen Tarifs ist aufgebraucht. Es wird keine technische Fehlermeldung angezeigt; du kannst deine Nutzung prüfen oder mehr Kontingent ansehen.",
                warning = true
            )
            Button(onClick = { showUpgrade = true }, modifier = Modifier.fillMaxWidth()) { Text("Upgrade-Möglichkeiten ansehen") }
        }

        if (showUpgrade) {
            CustomerSectionCard("TARIFE", "Mehr Möglichkeiten") {
                Text(
                    "Ein Tarifwechsel oder zusätzliches Kontingent wird nie automatisch ausgelöst. Die App zeigt hier nur den Einstieg; eine kostenpflichtige Änderung braucht deine ausdrückliche Bestätigung.",
                    color = NahwerkPalette.SecondaryText
                )
                OutlinedButton(onClick = { showUpgrade = false }, modifier = Modifier.fillMaxWidth()) { Text("Schließen") }
            }
        }
    }
}

@Composable
private fun CustomerPersonalSurface(
    onSessionExpired: () -> Unit,
    onOpenSecurity: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val api = remember { ProdCustomerApi(context) }
    var profile by remember { mutableStateOf<CustomerProfile?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        api.loadProfile().onSuccess { profile = it }.onFailure {
            if (!api.hasSession()) onSessionExpired() else error = customerSafeError(it)
        }
        loading = false
    }

    if (loading) CustomerLoading("Persönliche Daten werden geladen.")
    error?.let { CustomerMessageCard("Persönliche Daten", it, warning = true) }
    profile?.let { p ->
        CustomerSectionCard("PERSÖNLICHE DATEN", listOf(p.firstName, p.lastName).filter(String::isNotBlank).joinToString(" ")) {
            Text(p.email, color = NahwerkPalette.SecondaryText)
            if (p.whatsappNumber.isNotBlank()) Text(p.whatsappNumber, color = NahwerkPalette.SecondaryText)
            if (p.customerNumber.isNotBlank()) Text("Kundennummer ${p.customerNumber}", color = NahwerkPalette.SecondaryText)
            OutlinedButton(onClick = onOpenSecurity, modifier = Modifier.fillMaxWidth()) { Text("Sicherheit") }
        }
    }
    OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) { Text("Abmelden") }
}

@Composable
private fun CustomerConciergeSettingsSurface(onSessionExpired: () -> Unit, onBack: () -> Unit) {
    val context = LocalContext.current
    val api = remember { AppGatewayApi(context) }
    var home by remember { mutableStateOf<AppHomeSnapshot?>(null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        api.loadHome().onSuccess { home = it }.onFailure {
            if (it is AppGatewaySessionExpiredException) onSessionExpired() else error = customerSafeError(it)
        }
    }

    OutlinedButton(onClick = onBack) { Text("‹ Zur Übersicht") }
    error?.let { CustomerMessageCard("Concierge", it, warning = true) }
    CustomerSectionCard("CONCIERGE-EINSTELLUNGEN", "Dein aktueller Concierge") {
        PersonaContent(home?.persona)
        Text(
            "Die App verwendet die zentrale Concierge-Auswahl deines Kundenkontos. Eine separate App-Auswahl wird nicht geführt.",
            color = NahwerkPalette.SecondaryText
        )
    }
}

@Composable
private fun CustomerSecuritySurface(onBack: () -> Unit) {
    OutlinedButton(onClick = onBack) { Text("‹ Persönliche Daten") }
    CustomerSectionCard("SICHERHEIT", "Kontoschutz") {
        Text("Hier werden Kontoschutz, Authenticator und Passwortverwaltung gebündelt.", color = NahwerkPalette.SecondaryText)
        Text("Dieser Unterbereich verändert ohne deine ausdrückliche Aktion keine Sicherheitseinstellung.", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun ConciergeIdentityCard(persona: AppPersonaSnapshot?, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).testTag("current_concierge"),
        shape = RoundedCornerShape(NahwerkRadii.Large),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.ElevatedSurface),
        border = BorderStroke(1.dp, NahwerkPalette.Divider)
    ) {
        Row(
            Modifier.fillMaxWidth().padding(NahwerkSpacing.Lg),
            horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            persona?.imageUrl?.let { image ->
                AsyncImage(
                    model = image,
                    contentDescription = persona.displayName.takeIf(String::isNotBlank)?.let { "$it – Concierge" } ?: "Aktueller Concierge",
                    modifier = Modifier.heightIn(min = 54.dp, max = 64.dp)
                )
            }
            Column(Modifier.weight(1f)) {
                Text("DEIN CONCIERGE", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                Text(persona?.displayName?.takeIf(String::isNotBlank) ?: "Dein Concierge", style = MaterialTheme.typography.titleLarge)
                Text("Antippen für Concierge-Einstellungen", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun PersonaContent(persona: AppPersonaSnapshot?) {
    Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md), verticalAlignment = Alignment.CenterVertically) {
        persona?.imageUrl?.let { image ->
            AsyncImage(model = image, contentDescription = persona.displayName.ifBlank { "Concierge" }, modifier = Modifier.heightIn(min = 54.dp, max = 72.dp))
        }
        Column {
            Text(persona?.displayName?.takeIf(String::isNotBlank) ?: "Dein Concierge", style = MaterialTheme.typography.titleLarge)
            if (persona == null) Text("Die zentrale Auswahl wird geladen.", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
        }
    }
}

private data class UsageMetric(
    val used: Int?,
    val limit: Int?,
    val remaining: Int?,
    val reached: Boolean
)

private fun usageMetric(used: Int?, limit: Int?): UsageMetric {
    val normalizedUsed = used?.coerceAtLeast(0)
    val normalizedLimit = limit?.takeIf { it >= 0 }
    val remaining = if (normalizedUsed != null && normalizedLimit != null) (normalizedLimit - normalizedUsed).coerceAtLeast(0) else null
    return UsageMetric(
        used = normalizedUsed,
        limit = normalizedLimit,
        remaining = remaining,
        reached = normalizedUsed != null && normalizedLimit != null && normalizedUsed >= normalizedLimit
    )
}

@Composable
private fun UsageRow(label: String, metric: UsageMetric) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, style = MaterialTheme.typography.titleMedium)
        Text("Verbraucht: ${metric.used?.toString() ?: "—"}", color = NahwerkPalette.SecondaryText)
        Text("Verfügbar: ${metric.remaining?.toString() ?: "—"}", color = if (metric.reached) NahwerkPalette.Warning else NahwerkPalette.SecondaryText)
        metric.limit?.let { Text("Kontingent: $it", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall) }
    }
}

private fun formatUsageDate(raw: String): String = runCatching {
    DateTimeFormatter.ofPattern("dd.MM.yyyy")
        .withZone(ZoneId.of("Europe/Berlin"))
        .format(Instant.parse(raw))
}.getOrDefault(raw)

@Composable
private fun CustomerSectionCard(eyebrow: String, title: String, content: @Composable () -> Unit) {
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
            Text(eyebrow, color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
            Text(title, style = MaterialTheme.typography.titleLarge)
            content()
        }
    }
}

@Composable
private fun CustomerLoading(text: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm), verticalAlignment = Alignment.CenterVertically) {
        CircularProgressIndicator(strokeWidth = 2.dp)
        Text(text, color = NahwerkPalette.SecondaryText)
    }
}

@Composable
private fun CustomerMessageCard(title: String, body: String, warning: Boolean = false) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.ElevatedSurface),
        border = BorderStroke(1.dp, if (warning) NahwerkPalette.Warning else NahwerkPalette.Divider)
    ) {
        Column(Modifier.fillMaxWidth().padding(NahwerkSpacing.Lg), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(body, color = NahwerkPalette.SecondaryText)
        }
    }
}

private fun customerSafeError(error: Throwable?): String {
    val message = error?.message.orEmpty()
    return when {
        message.contains("Sitzung", ignoreCase = true) -> "Deine Sitzung ist abgelaufen. Bitte erneut anmelden."
        message.contains("nicht erreichbar", ignoreCase = true) -> "NAHWERK ist gerade nicht erreichbar. Bitte erneut versuchen."
        else -> "Die Daten konnten gerade nicht geladen werden. Bitte erneut versuchen."
    }
}

private fun customerSectionTitle(section: CustomerSection): String = when (section) {
    CustomerSection.OVERVIEW -> "Übersicht"
    CustomerSection.CONCIERGE -> "Concierge"
    CustomerSection.EMAIL -> "E-Mail"
    CustomerSection.SAFETY -> "Safety"
    CustomerSection.USAGE -> "Nutzung"
    CustomerSection.PERSONAL -> "Persönliche Daten"
    CustomerSection.CONCIERGE_SETTINGS -> "Concierge-Einstellungen"
    CustomerSection.SECURITY -> "Sicherheit"
}
