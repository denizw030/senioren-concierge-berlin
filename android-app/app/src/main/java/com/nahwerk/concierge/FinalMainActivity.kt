package com.nahwerk.concierge

import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nahwerk.concierge.data.HomeContext

internal enum class ClientDestination {
    CHAT,
    REMINDERS,
    ACCOUNT,
    USAGE,
    PERSONAL_DATA,
    SAFETY,
    FAMILY,
    NOTIFICATIONS,
    CHANNELS,
    BILLING,
    APP_STATUS
}

internal object ClientDeepLinkParser {
    fun parse(uri: Uri?): ClientDestination? {
        if (uri == null || uri.scheme != "nahwerk" || uri.host != "app") return null
        return when (uri.pathSegments.firstOrNull()?.lowercase()) {
            "chat" -> ClientDestination.CHAT
            "reminders" -> ClientDestination.REMINDERS
            "account" -> ClientDestination.ACCOUNT
            "usage" -> ClientDestination.USAGE
            "personal-data" -> ClientDestination.PERSONAL_DATA
            "safety" -> ClientDestination.SAFETY
            "family" -> ClientDestination.FAMILY
            "notifications" -> ClientDestination.NOTIFICATIONS
            "channels" -> ClientDestination.CHANNELS
            "billing" -> ClientDestination.BILLING
            "status" -> ClientDestination.APP_STATUS
            else -> null
        }
    }
}

class FinalMainActivity : ComponentActivity() {
    private var incomingTarget by mutableStateOf<ClientDestination?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        incomingTarget = ClientDeepLinkParser.parse(intent?.data)
        setContent {
            FinalNahwerkApp(
                incomingTarget = incomingTarget,
                onIncomingTargetConsumed = { incomingTarget = null }
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        incomingTarget = ClientDeepLinkParser.parse(intent.data)
    }
}

@Composable
internal fun FinalNahwerkApp(
    incomingTarget: ClientDestination? = null,
    onIncomingTargetConsumed: () -> Unit = {},
    viewModel: NahwerkAppViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    var accountDestination by rememberSaveable { mutableStateOf<ClientDestination?>(null) }
    val online = rememberNetworkAvailability()

    LaunchedEffect(incomingTarget, state.home) {
        val target = incomingTarget ?: return@LaunchedEffect
        if (state.home == null) return@LaunchedEffect
        when (target) {
            ClientDestination.CHAT -> viewModel.open(AppScreen.CHAT)
            ClientDestination.REMINDERS -> viewModel.open(AppScreen.REMINDERS)
            else -> {
                viewModel.open(AppScreen.SETTINGS)
                accountDestination = target.takeUnless { it == ClientDestination.ACCOUNT }
            }
        }
        onIncomingTargetConsumed()
    }

    LaunchedEffect(state.screen) {
        if (state.screen != AppScreen.SETTINGS) accountDestination = null
    }

    BackHandler(enabled = state.screen == AppScreen.SETTINGS && accountDestination != null) {
        accountDestination = null
    }
    BackHandler(
        enabled = state.screen in setOf(AppScreen.CHAT, AppScreen.REMINDERS, AppScreen.SETTINGS) &&
            accountDestination == null
    ) {
        viewModel.goHome()
    }

    NahwerkTheme {
        Box(Modifier.fillMaxSize().background(NahwerkPalette.Background)) {
            when {
                state.screen == AppScreen.LOGIN -> LoginScreen(
                    busy = state.loginBusy,
                    error = state.error,
                    notice = state.notice,
                    onLogin = viewModel::login,
                    onReset = viewModel::requestPasswordReset
                )

                state.home == null && state.loading -> FinalLoadingScreen()

                state.home == null -> FinalContextErrorScreen(
                    error = state.error ?: "Konto konnte nicht geladen werden.",
                    onRetry = viewModel::refreshHome,
                    onLogout = viewModel::logout
                )

                state.screen == AppScreen.HOME -> HomeScreen(
                    home = requireNotNull(state.home),
                    refreshing = state.loading,
                    error = state.error,
                    onChat = { viewModel.open(AppScreen.CHAT) },
                    onReminders = { viewModel.open(AppScreen.REMINDERS) },
                    onSettings = { viewModel.open(AppScreen.SETTINGS) },
                    onRefresh = { viewModel.refreshHome() }
                )

                state.screen == AppScreen.CHAT -> ChatScreen(
                    home = requireNotNull(state.home),
                    messages = state.chatMessages,
                    draft = state.chatDraft,
                    sending = state.chatSending,
                    error = state.chatError,
                    pendingRequest = state.pendingRequest,
                    onDraftChange = viewModel::updateDraft,
                    onSend = viewModel::sendChat,
                    onRetry = viewModel::retryPending,
                    onDiscard = viewModel::discardPending,
                    onBack = viewModel::goHome
                )

                state.screen == AppScreen.REMINDERS -> ReminderScreen(
                    reminders = requireNotNull(state.home).reminders,
                    onBack = viewModel::goHome,
                    onChat = { viewModel.open(AppScreen.CHAT) },
                    onSettings = { viewModel.open(AppScreen.SETTINGS) }
                )

                state.screen == AppScreen.SETTINGS && accountDestination == null -> FinalAccountHubScreen(
                    home = requireNotNull(state.home),
                    onBack = viewModel::goHome,
                    onChat = { viewModel.open(AppScreen.CHAT) },
                    onReminders = { viewModel.open(AppScreen.REMINDERS) },
                    onOpen = { accountDestination = it },
                    onLogout = viewModel::logout
                )

                state.screen == AppScreen.SETTINGS -> FinalCapabilityScreen(
                    destination = accountDestination ?: ClientDestination.APP_STATUS,
                    onBack = { accountDestination = null }
                )

                else -> FinalLoadingScreen()
            }

            if (!online) OfflineBanner(Modifier.align(Alignment.TopCenter))
        }
    }
}

@Composable
private fun FinalLoadingScreen() {
    Box(
        Modifier.fillMaxSize().safeDrawingPadding().testTag("final_loading_screen"),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Lg)) {
            Text("NAHWERK", color = NahwerkPalette.Gold, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
            CircularProgressIndicator(color = NahwerkPalette.Gold, strokeWidth = 2.dp)
            Text("Concierge wird geladen", color = NahwerkPalette.SecondaryText)
        }
    }
}

@Composable
private fun FinalContextErrorScreen(error: String, onRetry: () -> Unit, onLogout: () -> Unit) {
    Box(
        Modifier.fillMaxSize().safeDrawingPadding().padding(NahwerkSpacing.Xxl),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(NahwerkRadii.Large),
            colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
            border = BorderStroke(1.dp, NahwerkPalette.Divider)
        ) {
            Column(Modifier.padding(NahwerkSpacing.Xl), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)) {
                Text("Verbindung nicht verfügbar", style = MaterialTheme.typography.headlineSmall)
                Text("Der bestätigte Kontokontext konnte nicht geladen werden.", color = NahwerkPalette.SecondaryText)
                FinalStatusPanel(error, error = true)
                OutlinedButton(onClick = onRetry, modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch)) {
                    Text("Erneut versuchen")
                }
                TextButton(onClick = onLogout, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text("Abmelden") }
            }
        }
    }
}

@Composable
private fun OfflineBanner(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth().safeDrawingPadding().semantics { liveRegion = LiveRegionMode.Polite }.testTag("offline_banner"),
        color = NahwerkPalette.Warning,
        contentColor = MaterialTheme.colorScheme.onPrimary
    ) {
        Text(
            "Offline · Offene Chat-Anfragen bleiben für einen sicheren Retry erhalten.",
            modifier = Modifier.padding(horizontal = NahwerkSpacing.Lg, vertical = NahwerkSpacing.Sm),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
internal fun FinalAccountHubScreen(
    home: HomeContext,
    onBack: () -> Unit,
    onChat: () -> Unit,
    onReminders: () -> Unit,
    onOpen: (ClientDestination) -> Unit,
    onLogout: () -> Unit
) {
    Scaffold(
        containerColor = NahwerkPalette.Background,
        topBar = { FinalHeader("Konto & Dienste", onBack) },
        bottomBar = { FinalBottomBar(AppScreen.SETTINGS, onBack, onChat, onReminders) }
    ) { padding ->
        LazyColumn(
            Modifier.padding(padding).fillMaxSize().testTag("account_hub"),
            contentPadding = PaddingValues(NahwerkSpacing.Xl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Lg)
        ) {
            item {
                FinalCard {
                    Text("${home.concierge.name} · Persönlicher Concierge", style = MaterialTheme.typography.titleLarge)
                    Text(
                        "Der App-Client zeigt ausschließlich bestätigte oder ausdrücklich blockierte Zustände.",
                        color = NahwerkPalette.SecondaryText,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)) {
                        FinalMetric("${home.memoryCount}", "Memory", Modifier.weight(1f))
                        FinalMetric("${home.openLoopCount}", "Offen", Modifier.weight(1f))
                    }
                }
            }

            item { FinalSectionTitle("Konto") }
            item { FinalHubButton("Persönliche Daten", "Autorisierter Profil-Contract erforderlich", ClientDestination.PERSONAL_DATA, onOpen) }
            item { FinalHubButton("Nutzung & Limits", "Keine erfundenen Verbrauchswerte", ClientDestination.USAGE, onOpen) }
            item { FinalHubButton("Abo & Billing", "Read-only bis Billing-Contract freigegeben ist", ClientDestination.BILLING, onOpen) }

            item { FinalSectionTitle("Dienste") }
            item { FinalHubButton("Safety", "Backend/Core bleibt alleinige Safety-Autorität", ClientDestination.SAFETY, onOpen) }
            item { FinalHubButton("Family", "Keine lokale Rollen- oder Relationship-Autorität", ClientDestination.FAMILY, onOpen) }
            item { FinalHubButton("Benachrichtigungen", "Push-Registration bleibt blockiert", ClientDestination.NOTIFICATIONS, onOpen) }
            item { FinalHubButton("Kanäle", "Voice und WhatsApp bleiben am zentralen Core", ClientDestination.CHANNELS, onOpen) }

            item { FinalSectionTitle("App") }
            item { FinalHubButton("App- & Contract-Status", "17 Client-Capabilities mit Fail-closed-Stand", ClientDestination.APP_STATUS, onOpen) }

            item {
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch),
                    border = BorderStroke(1.dp, NahwerkPalette.Divider),
                    shape = RoundedCornerShape(NahwerkRadii.Medium)
                ) { Text("Sicher abmelden") }
            }
            item {
                Text(
                    "STAGING · Keine Voice-, WhatsApp-, Payment-, Safety- oder PROD-Aktion aus diesem Client-Screen.",
                    color = NahwerkPalette.SecondaryText,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

@Composable
private fun FinalCapabilityScreen(destination: ClientDestination, onBack: () -> Unit) {
    val capabilities = when (destination) {
        ClientDestination.USAGE -> listOf(ClientCapabilityId.USAGE_LIMITS)
        ClientDestination.PERSONAL_DATA -> listOf(ClientCapabilityId.PERSONAL_DATA)
        ClientDestination.SAFETY -> listOf(ClientCapabilityId.SAFETY)
        ClientDestination.FAMILY -> listOf(ClientCapabilityId.FAMILY)
        ClientDestination.NOTIFICATIONS -> listOf(ClientCapabilityId.NOTIFICATIONS)
        ClientDestination.CHANNELS -> listOf(
            ClientCapabilityId.VOICE_HANDOFF,
            ClientCapabilityId.WHATSAPP_CONTINUITY,
            ClientCapabilityId.CONVERSATION_CONTINUITY
        )
        ClientDestination.BILLING -> listOf(ClientCapabilityId.BILLING_SUBSCRIPTION)
        ClientDestination.APP_STATUS -> ClientCapabilityCatalog.all.map { it.id }
        else -> listOf(ClientCapabilityId.ERROR_HANDLING)
    }
    val title = when (destination) {
        ClientDestination.USAGE -> "Nutzung & Limits"
        ClientDestination.PERSONAL_DATA -> "Persönliche Daten"
        ClientDestination.SAFETY -> "Safety"
        ClientDestination.FAMILY -> "Family"
        ClientDestination.NOTIFICATIONS -> "Benachrichtigungen"
        ClientDestination.CHANNELS -> "Kanäle"
        ClientDestination.BILLING -> "Abo & Billing"
        ClientDestination.APP_STATUS -> "App- & Contract-Status"
        else -> "Status"
    }

    Scaffold(containerColor = NahwerkPalette.Background, topBar = { FinalHeader(title, onBack) }) { padding ->
        LazyColumn(
            Modifier.padding(padding).fillMaxSize().testTag("capability_screen"),
            contentPadding = PaddingValues(NahwerkSpacing.Xl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Lg)
        ) {
            item {
                Text(
                    "Diese Ansicht ist absichtlich fail-closed: Der Android-Client zeigt Status, übernimmt aber keine Business-Autorität.",
                    color = NahwerkPalette.SecondaryText,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            items(capabilities, key = { it.name }) { id ->
                FinalCapabilityCard(ClientCapabilityCatalog.byId(id))
            }
        }
    }
}

@Composable
private fun FinalCapabilityCard(capability: ClientCapability) {
    FinalCard(Modifier.testTag("capability_${capability.id.name.lowercase()}")) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(capability.title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            FinalStatusChip(capability.status)
        }
        FinalKeyValue("Frontend", capability.frontend)
        FinalKeyValue("Contract", capability.contract)
        FinalKeyValue("Endpoint", capability.endpoint)
        FinalKeyValue("TEST/STAGING", capability.staging)
        FinalKeyValue("PROD", capability.prod)
        FinalKeyValue("Fail-closed", capability.failClosed)
        FinalKeyValue("Restarbeit", capability.remainingWork)
    }
}

@Composable
private fun FinalHubButton(
    title: String,
    subtitle: String,
    destination: ClientDestination,
    onOpen: (ClientDestination) -> Unit
) {
    OutlinedButton(
        onClick = { onOpen(destination) },
        modifier = Modifier.fillMaxWidth().heightIn(min = 72.dp),
        shape = RoundedCornerShape(NahwerkRadii.Large),
        border = BorderStroke(1.dp, NahwerkPalette.Divider),
        contentPadding = PaddingValues(NahwerkSpacing.Lg)
    ) {
        Column(Modifier.weight(1f), horizontalAlignment = Alignment.Start, verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
            Text(title, color = NahwerkPalette.PrimaryText, style = MaterialTheme.typography.titleMedium)
            Text(subtitle, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
        }
        Text("›", color = NahwerkPalette.Gold, style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
private fun FinalHeader(title: String, onBack: () -> Unit) {
    Surface(color = NahwerkPalette.Surface, border = BorderStroke(1.dp, NahwerkPalette.Divider)) {
        Row(
            Modifier.fillMaxWidth().safeDrawingPadding().padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
        ) {
            TextButton(
                onClick = onBack,
                modifier = Modifier.heightIn(min = NahwerkSizes.Touch).semantics { contentDescription = "Zurück" }
            ) { Text("‹", color = NahwerkPalette.Gold, style = MaterialTheme.typography.headlineMedium) }
            Text(title, style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun FinalBottomBar(
    current: AppScreen,
    onHome: () -> Unit,
    onChat: () -> Unit,
    onReminders: () -> Unit
) {
    Surface(color = NahwerkPalette.Surface, border = BorderStroke(1.dp, NahwerkPalette.Divider)) {
        Row(
            Modifier.fillMaxWidth().safeDrawingPadding().padding(NahwerkSpacing.Xs),
            horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)
        ) {
            FinalNavButton("Übersicht", current == AppScreen.HOME, onHome, Modifier.weight(1f))
            FinalNavButton("Concierge", current == AppScreen.CHAT, onChat, Modifier.weight(1f))
            FinalNavButton("Erinnerungen", current == AppScreen.REMINDERS, onReminders, Modifier.weight(1f))
            FinalNavButton("Konto", current == AppScreen.SETTINGS, {}, Modifier.weight(1f))
        }
    }
}

@Composable
private fun FinalNavButton(label: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    TextButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = 58.dp),
        colors = ButtonDefaults.textButtonColors(
            containerColor = if (selected) NahwerkPalette.GoldSoft else NahwerkPalette.Surface,
            contentColor = if (selected) NahwerkPalette.Gold else NahwerkPalette.SecondaryText
        )
    ) { Text(label, maxLines = 1, style = MaterialTheme.typography.labelSmall) }
}

@Composable
private fun FinalCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(NahwerkRadii.Large),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
        border = BorderStroke(1.dp, NahwerkPalette.Divider)
    ) {
        Column(Modifier.padding(NahwerkSpacing.Xl), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)) {
            content()
        }
    }
}

@Composable
private fun FinalMetric(value: String, label: String, modifier: Modifier = Modifier) {
    Surface(modifier = modifier, color = NahwerkPalette.ElevatedSurface, shape = RoundedCornerShape(NahwerkRadii.Medium)) {
        Column(Modifier.padding(NahwerkSpacing.Md), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
            Text(value, color = NahwerkPalette.Gold, style = MaterialTheme.typography.titleLarge)
            Text(label, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
private fun FinalSectionTitle(text: String) {
    Text(text, color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
}

@Composable
private fun FinalKeyValue(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
        Text(label.uppercase(), color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
        Text(value, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodyMedium)
    }
    HorizontalDivider(color = NahwerkPalette.Divider)
}

@Composable
private fun FinalStatusChip(status: ClientCapabilityStatus) {
    val accent = when (status) {
        ClientCapabilityStatus.READY -> NahwerkPalette.Success
        ClientCapabilityStatus.PARTIAL -> NahwerkPalette.Warning
        ClientCapabilityStatus.MISSING -> NahwerkPalette.Error
        else -> NahwerkPalette.Warning
    }
    Surface(
        color = accent.copy(alpha = 0.12f),
        shape = RoundedCornerShape(NahwerkRadii.Pill),
        border = BorderStroke(1.dp, accent.copy(alpha = 0.34f))
    ) {
        Text(
            status.name.replace('_', ' '),
            color = accent,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Sm)
        )
    }
}

@Composable
private fun FinalStatusPanel(message: String, error: Boolean) {
    val accent = if (error) NahwerkPalette.Error else NahwerkPalette.Success
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = accent.copy(alpha = 0.10f),
        shape = RoundedCornerShape(NahwerkRadii.Medium),
        border = BorderStroke(1.dp, accent.copy(alpha = 0.32f))
    ) {
        Text(message, color = accent, modifier = Modifier.padding(NahwerkSpacing.Md), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun rememberNetworkAvailability(): Boolean {
    val context = LocalContext.current
    val connectivity = remember(context) {
        context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    }
    var online by remember { mutableStateOf(connectivity.isValidatedOnline()) }

    DisposableEffect(connectivity) {
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                online = connectivity.isValidatedOnline()
            }

            override fun onLost(network: Network) {
                online = connectivity.isValidatedOnline()
            }

            override fun onCapabilitiesChanged(network: Network, networkCapabilities: NetworkCapabilities) {
                online = networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            }
        }
        connectivity.registerDefaultNetworkCallback(callback)
        online = connectivity.isValidatedOnline()
        onDispose { runCatching { connectivity.unregisterNetworkCallback(callback) } }
    }
    return online
}

private fun ConnectivityManager.isValidatedOnline(): Boolean {
    val network = activeNetwork ?: return false
    val capabilities = getNetworkCapabilities(network) ?: return false
    return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
        capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
}
