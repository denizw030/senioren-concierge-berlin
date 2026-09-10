package com.nahwerk.concierge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.nahwerk.concierge.data.ChatMessage
import com.nahwerk.concierge.data.HomeContext
import com.nahwerk.concierge.data.PendingChatRequest
import com.nahwerk.concierge.data.Reminder

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { NahwerkApp() }
    }
}

@Composable
internal fun NahwerkApp(viewModel: NahwerkAppViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsState()
    val childScreen = state.screen in setOf(AppScreen.CHAT, AppScreen.REMINDERS, AppScreen.SETTINGS)
    BackHandler(enabled = childScreen) { viewModel.goHome() }

    NahwerkTheme {
        when {
            state.screen == AppScreen.LOGIN -> LoginScreen(
                busy = state.loginBusy,
                error = state.error,
                notice = state.notice,
                onLogin = viewModel::login,
                onReset = viewModel::requestPasswordReset
            )
            state.home == null && state.loading -> LoadingScreen()
            state.home == null -> ContextLoadErrorScreen(
                error = state.error ?: "Konto konnte nicht geladen werden.",
                onRetry = { viewModel.refreshHome() },
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
            state.screen == AppScreen.SETTINGS -> SettingsScreen(
                home = requireNotNull(state.home),
                onBack = viewModel::goHome,
                onLogout = viewModel::logout,
                onChat = { viewModel.open(AppScreen.CHAT) },
                onReminders = { viewModel.open(AppScreen.REMINDERS) }
            )
            else -> LoadingScreen()
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(
        Modifier.fillMaxSize().background(NahwerkPalette.Background).safeDrawingPadding().testTag("loading_screen"),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Lg)) {
            BrandWordmark()
            CircularProgressIndicator(
                color = NahwerkPalette.Gold,
                modifier = Modifier.size(30.dp).semantics { liveRegion = LiveRegionMode.Polite },
                strokeWidth = 2.dp
            )
            Text("Concierge wird geladen", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun ContextLoadErrorScreen(error: String, onRetry: () -> Unit, onLogout: () -> Unit) {
    Box(
        Modifier.fillMaxSize().background(NahwerkPalette.Background).safeDrawingPadding().padding(NahwerkSpacing.Xxl),
        contentAlignment = Alignment.Center
    ) {
        PremiumCard(Modifier.fillMaxWidth().widthIn(max = 520.dp)) {
            BrandWordmark()
            Text("Verbindung nicht verfügbar", style = MaterialTheme.typography.headlineSmall)
            Text(
                "Der bestätigte Kontokontext konnte nicht geladen werden.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.bodyMedium
            )
            ErrorText(error)
            PrimaryButton("Erneut versuchen", onRetry, Modifier.fillMaxWidth())
            TextButton(
                onClick = onLogout,
                modifier = Modifier.align(Alignment.CenterHorizontally).heightIn(min = NahwerkSizes.Touch)
            ) { Text("Abmelden") }
        }
    }
}

@Composable
internal fun LoginScreen(
    busy: Boolean,
    error: String?,
    notice: String?,
    onLogin: (String, String) -> Unit,
    onReset: (String) -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val canLogin = !busy && email.isNotBlank() && password.length >= 8

    Box(
        Modifier.fillMaxSize()
            .background(Brush.verticalGradient(listOf(NahwerkPalette.Background, NahwerkPalette.SoftSurface)))
            .safeDrawingPadding().imePadding().padding(NahwerkSpacing.Xxl),
        contentAlignment = Alignment.Center
    ) {
        Column(
            Modifier.fillMaxWidth().widthIn(max = 540.dp).verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)
        ) {
            BrandWordmark()
            Column(verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                Text("Dein persönlicher Concierge", style = MaterialTheme.typography.headlineMedium)
                Text(
                    "Ein Gespräch. Derselbe zentrale Core – auch unterwegs.",
                    color = NahwerkPalette.SecondaryText,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            PremiumCard {
                SectionEyebrow("SICHER ANMELDEN")
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("E-Mail") },
                    modifier = Modifier.fillMaxWidth().testTag("login_email"),
                    singleLine = true,
                    enabled = !busy,
                    shape = RoundedCornerShape(NahwerkRadii.Medium),
                    colors = premiumInputColors(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next)
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Passwort") },
                    modifier = Modifier.fillMaxWidth().testTag("login_password"),
                    singleLine = true,
                    enabled = !busy,
                    shape = RoundedCornerShape(NahwerkRadii.Medium),
                    colors = premiumInputColors(),
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { if (canLogin) onLogin(email, password) })
                )
                Button(
                    onClick = { onLogin(email, password) },
                    enabled = canLogin,
                    modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch).testTag("login_submit"),
                    shape = RoundedCornerShape(NahwerkRadii.Medium),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = NahwerkPalette.Gold,
                        contentColor = MaterialTheme.colorScheme.onPrimary
                    )
                ) {
                    if (busy) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Anmelden")
                }
                TextButton(
                    onClick = { onReset(email) },
                    enabled = !busy && email.isNotBlank(),
                    modifier = Modifier.align(Alignment.CenterHorizontally).heightIn(min = NahwerkSizes.Touch)
                ) { Text("Passwort zurücksetzen") }
                if (!error.isNullOrBlank()) ErrorText(error)
                if (!notice.isNullOrBlank()) StatusText(notice)
            }
            Text(
                "STAGING · Testversion · Sitzungstoken werden verschlüsselt auf dem Gerät gespeichert.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

@Composable
internal fun HomeScreen(
    home: HomeContext,
    refreshing: Boolean,
    error: String?,
    onChat: () -> Unit,
    onReminders: () -> Unit,
    onSettings: () -> Unit,
    onRefresh: () -> Unit
) {
    Scaffold(
        containerColor = NahwerkPalette.Background,
        modifier = Modifier.testTag("home_screen"),
        bottomBar = {
            NahwerkBottomNavigation(
                current = AppScreen.HOME,
                onHome = {},
                onChat = onChat,
                onReminders = onReminders,
                onSettings = onSettings
            )
        }
    ) { padding ->
        LazyColumn(
            Modifier.padding(padding).fillMaxSize(),
            contentPadding = PaddingValues(
                start = NahwerkSpacing.Xl,
                end = NahwerkSpacing.Xl,
                top = NahwerkSpacing.Xl,
                bottom = NahwerkSpacing.Xxl
            ),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)
        ) {
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
                        BrandWordmark()
                        Text("Persönlicher Concierge", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodyMedium)
                    }
                    StatusChip("STAGING", NahwerkPalette.Warning)
                }
            }
            item { ConciergeHero(home, onChat) }
            item {
                SectionHeader("Aktuell", "Bestätigter Kontext aus dem zentralen Core")
                Spacer(Modifier.height(NahwerkSpacing.Md))
                PremiumCard {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
                            Text(
                                if (home.openLoopCount == 1) "1 offener Vorgang" else "${home.openLoopCount} offene Vorgänge",
                                style = MaterialTheme.typography.titleLarge
                            )
                            Text(
                                if (home.openLoopCount == 0) "Im bestätigten Kontext ist aktuell kein offener Vorgang sichtbar."
                                else "Details werden erst mit bestätigtem Task-Vertrag angezeigt.",
                                color = NahwerkPalette.SecondaryText,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                        Text(home.openLoopCount.toString(), color = NahwerkPalette.Gold, style = MaterialTheme.typography.headlineMedium)
                    }
                }
            }
            item {
                SectionHeader("Schnellzugriff", "Bereits bestätigte mobile Funktionen")
                Spacer(Modifier.height(NahwerkSpacing.Md))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)) {
                    QuickActionButton("Concierge", "✦", onChat, Modifier.weight(1f))
                    QuickActionButton("Erinnerungen", "✓", onReminders, Modifier.weight(1f))
                }
            }
            item {
                SectionHeader("Dein Kontext", "Nur tatsächlich geladene Werte")
                Spacer(Modifier.height(NahwerkSpacing.Md))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)) {
                    MetricCard(home.memoryCount.toString(), "Memory-Fakten", Modifier.weight(1f))
                    MetricCard(home.reminders.size.toString(), "Erinnerungen", Modifier.weight(1f))
                }
            }
            if (!error.isNullOrBlank()) item { ErrorText(error) }
            item {
                TextButton(
                    onClick = onRefresh,
                    enabled = !refreshing,
                    modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.Touch)
                ) { Text(if (refreshing) "Kontext wird aktualisiert …" else "Kontext aktualisieren") }
            }
        }
    }
}

@Composable
private fun ConciergeHero(home: HomeContext, onChat: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().aspectRatio(1.42f),
        shape = RoundedCornerShape(NahwerkRadii.Hero),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
        border = BorderStroke(1.dp, NahwerkPalette.Divider)
    ) {
        Box(Modifier.fillMaxSize()) {
            AsyncImage(
                model = home.concierge.imageUrl,
                contentDescription = "${home.concierge.name}, persönlicher NAHWERK Concierge",
                contentScale = ContentScale.Crop,
                alignment = Alignment.CenterEnd,
                modifier = Modifier.align(Alignment.CenterEnd).fillMaxHeight().fillMaxWidth(0.68f)
            )
            Box(
                Modifier.fillMaxSize().background(
                    Brush.horizontalGradient(
                        listOf(
                            NahwerkPalette.Surface,
                            NahwerkPalette.Surface.copy(alpha = 0.96f),
                            NahwerkPalette.Surface.copy(alpha = 0.70f),
                            Color.Transparent
                        )
                    )
                )
            )
            Column(
                Modifier.fillMaxHeight().fillMaxWidth(0.70f).padding(NahwerkSpacing.Xl),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                StatusChip("PERSÖNLICHER CONCIERGE", NahwerkPalette.Gold)
                Column(verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                    Text(home.concierge.name, color = NahwerkPalette.Gold, style = MaterialTheme.typography.titleMedium)
                    Text(home.greeting, style = MaterialTheme.typography.headlineSmall)
                    Text("Dasselbe Gespräch. Derselbe zentrale Core.", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
                    PrimaryButton("Concierge öffnen", onChat, Modifier.fillMaxWidth().testTag("open_chat"))
                }
            }
        }
    }
}

@Composable
internal fun ChatScreen(
    home: HomeContext,
    messages: List<ChatMessage>,
    draft: String,
    sending: Boolean,
    error: String?,
    pendingRequest: PendingChatRequest?,
    onDraftChange: (String) -> Unit,
    onSend: () -> Unit,
    onRetry: () -> Unit,
    onDiscard: () -> Unit,
    onBack: () -> Unit
) {
    val listState = rememberLazyListState()
    LaunchedEffect(messages.size, pendingRequest?.sourceMessageId, error) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex)
    }

    Scaffold(
        containerColor = NahwerkPalette.Background,
        modifier = Modifier.testTag("chat_screen"),
        topBar = { ChatTopBar(home.concierge.name, onBack) }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().imePadding(),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
        ) {
            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth().testTag("chat_messages"),
                contentPadding = PaddingValues(
                    start = NahwerkSpacing.Lg,
                    end = NahwerkSpacing.Lg,
                    top = NahwerkSpacing.Lg,
                    bottom = NahwerkSpacing.Sm
                ),
                verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
            ) {
                if (messages.isEmpty()) item(key = "empty") { EmptyChatState(home.concierge.name) }
                items(messages, key = { it.sourceMessageId ?: "${it.role}:${it.text.hashCode()}" }) { MessageBubble(it) }
                pendingRequest?.let { pending ->
                    item(key = "pending:${pending.sourceMessageId}") {
                        PendingRequestPanel(sending, error, onRetry, onDiscard)
                    }
                }
                if (pendingRequest == null && !error.isNullOrBlank()) item(key = "error") { ErrorText(error) }
            }
            ChatComposer(
                conciergeName = home.concierge.name,
                draft = draft,
                sending = sending,
                locked = pendingRequest != null,
                onDraftChange = onDraftChange,
                onSend = onSend,
                modifier = Modifier.padding(horizontal = NahwerkSpacing.Lg)
            )
            Text(
                "Verarbeitung über den zentralen NAHWERK Core.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.padding(start = NahwerkSpacing.Xl, end = NahwerkSpacing.Xl, bottom = NahwerkSpacing.Sm)
            )
        }
    }
}

@Composable
private fun ChatTopBar(conciergeName: String, onBack: () -> Unit) {
    Surface(color = NahwerkPalette.Surface) {
        Row(
            Modifier.fillMaxWidth().safeDrawingPadding().padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
        ) {
            TextButton(
                onClick = onBack,
                modifier = Modifier.size(NahwerkSizes.Touch).semantics { contentDescription = "Zur Übersicht" },
                contentPadding = PaddingValues(0.dp)
            ) { Text("‹", color = NahwerkPalette.Gold, style = MaterialTheme.typography.headlineMedium) }
            Column(Modifier.weight(1f)) {
                Text(conciergeName, style = MaterialTheme.typography.titleMedium)
                Text("Persönlicher Concierge", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelSmall)
            }
            StatusChip("CORE", NahwerkPalette.Success)
        }
    }
}

@Composable
private fun EmptyChatState(conciergeName: String) {
    Column(
        Modifier.fillMaxWidth().padding(top = 64.dp, bottom = NahwerkSpacing.Xxl),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
    ) {
        Surface(
            shape = RoundedCornerShape(NahwerkRadii.Pill),
            color = NahwerkPalette.GoldSoft,
            modifier = Modifier.size(52.dp)
        ) { Box(contentAlignment = Alignment.Center) { Text("✦", color = NahwerkPalette.Gold, style = MaterialTheme.typography.titleLarge) } }
        Text("Was darf ich für dich tun?", style = MaterialTheme.typography.headlineSmall)
        Text(
            "Schreib $conciergeName, was erledigt werden soll.",
            color = NahwerkPalette.SecondaryText,
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
private fun MessageBubble(message: ChatMessage) {
    val isUser = message.role == "user"
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
        Card(
            modifier = Modifier.fillMaxWidth(0.86f).widthIn(max = 420.dp),
            shape = RoundedCornerShape(
                topStart = NahwerkRadii.Large,
                topEnd = NahwerkRadii.Large,
                bottomStart = if (isUser) NahwerkRadii.Large else NahwerkRadii.Small,
                bottomEnd = if (isUser) NahwerkRadii.Small else NahwerkRadii.Large
            ),
            colors = CardDefaults.cardColors(containerColor = if (isUser) NahwerkPalette.GoldSoft else NahwerkPalette.ElevatedSurface),
            border = BorderStroke(1.dp, if (isUser) NahwerkPalette.Gold.copy(alpha = 0.26f) else NahwerkPalette.Divider)
        ) {
            Column(
                Modifier.padding(horizontal = NahwerkSpacing.Lg, vertical = NahwerkSpacing.Md),
                verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)
            ) {
                Text(
                    if (isUser) "DU" else "NAHWERK",
                    color = if (isUser) NahwerkPalette.Gold else NahwerkPalette.SecondaryText,
                    style = MaterialTheme.typography.labelSmall
                )
                Text(message.text, color = NahwerkPalette.PrimaryText, style = MaterialTheme.typography.bodyLarge)
            }
        }
    }
}

@Composable
private fun PendingRequestPanel(
    sending: Boolean,
    error: String?,
    onRetry: () -> Unit,
    onDiscard: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().testTag("pending_request"),
        shape = RoundedCornerShape(NahwerkRadii.Large),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.SoftSurface),
        border = BorderStroke(1.dp, NahwerkPalette.Warning.copy(alpha = 0.38f))
    ) {
        Column(Modifier.padding(NahwerkSpacing.Lg), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                StatusDot(NahwerkPalette.Warning, "Offener Status")
                Text("Antwortstatus offen", color = NahwerkPalette.Warning, style = MaterialTheme.typography.titleMedium)
            }
            Text(
                "Es liegt noch keine bestätigte Antwort vor. Ein erneuter Versuch verwendet dieselbe Anfrage.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.bodyMedium
            )
            if (!error.isNullOrBlank()) ErrorText(error)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                OutlinedButton(
                    onClick = onRetry,
                    enabled = !sending,
                    modifier = Modifier.weight(1f).heightIn(min = NahwerkSizes.Touch).testTag("pending_retry"),
                    shape = RoundedCornerShape(NahwerkRadii.Medium),
                    border = BorderStroke(1.dp, NahwerkPalette.Gold)
                ) { Text(if (sending) "Wird versucht …" else "Erneut versuchen") }
                TextButton(
                    onClick = onDiscard,
                    enabled = !sending,
                    modifier = Modifier.heightIn(min = NahwerkSizes.Touch).testTag("pending_discard")
                ) { Text("Verwerfen") }
            }
        }
    }
}

@Composable
private fun ChatComposer(
    conciergeName: String,
    draft: String,
    sending: Boolean,
    locked: Boolean,
    onDraftChange: (String) -> Unit,
    onSend: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
        if (sending) {
            Row(
                Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)
            ) {
                CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp, color = NahwerkPalette.Gold)
                Text("Wird sicher übermittelt …", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelMedium)
            }
        }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
            OutlinedTextField(
                value = draft,
                onValueChange = onDraftChange,
                modifier = Modifier.weight(1f).testTag("chat_input"),
                label = { Text(if (locked) "Antwortstatus offen" else "Nachricht") },
                placeholder = { Text("Nachricht an $conciergeName") },
                minLines = 1,
                maxLines = 4,
                enabled = !locked && !sending,
                shape = RoundedCornerShape(NahwerkRadii.Medium),
                colors = premiumInputColors(),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { if (draft.isNotBlank() && !locked && !sending) onSend() })
            )
            Button(
                onClick = onSend,
                enabled = !sending && draft.isNotBlank() && !locked,
                modifier = Modifier.size(NahwerkSizes.ComposerButton).testTag("chat_send")
                    .semantics { contentDescription = "Nachricht senden" },
                shape = RoundedCornerShape(NahwerkRadii.Medium),
                contentPadding = PaddingValues(0.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = NahwerkPalette.Gold,
                    contentColor = MaterialTheme.colorScheme.onPrimary
                )
            ) { Text("↑", style = MaterialTheme.typography.titleLarge) }
        }
    }
}

@Composable
internal fun ReminderScreen(
    reminders: List<Reminder>,
    onBack: () -> Unit,
    onChat: () -> Unit = {},
    onSettings: () -> Unit = {}
) {
    Scaffold(
        containerColor = NahwerkPalette.Background,
        topBar = { SimpleScreenHeader("Erinnerungen", onBack) },
        bottomBar = {
            NahwerkBottomNavigation(
                current = AppScreen.REMINDERS,
                onHome = onBack,
                onChat = onChat,
                onReminders = {},
                onSettings = onSettings
            )
        }
    ) { padding ->
        LazyColumn(
            Modifier.padding(padding).fillMaxSize(),
            contentPadding = PaddingValues(NahwerkSpacing.Xl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
        ) {
            item {
                Text(
                    "Aus dem bestätigten bestehenden Mobile-Contract.",
                    color = NahwerkPalette.SecondaryText,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            if (reminders.isEmpty()) {
                item { EmptyPanel("✓", "Alles ruhig", "Aktuell sind keine Erinnerungen im bestätigten Kontext vorhanden.") }
            } else {
                items(reminders, key = { it.id }) { ReminderCard(it) }
            }
        }
    }
}

@Composable
private fun ReminderCard(reminder: Reminder) {
    PremiumCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
                Text(reminder.title, style = MaterialTheme.typography.titleMedium)
                if (!reminder.dueAt.isNullOrBlank()) {
                    Text(reminder.dueAt, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
                }
            }
            StatusChip(reminder.status, NahwerkPalette.Gold)
        }
    }
}

@Composable
internal fun SettingsScreen(
    home: HomeContext,
    onBack: () -> Unit,
    onLogout: () -> Unit,
    onChat: () -> Unit = {},
    onReminders: () -> Unit = {}
) {
    Scaffold(
        containerColor = NahwerkPalette.Background,
        topBar = { SimpleScreenHeader("Konto", onBack) },
        bottomBar = {
            NahwerkBottomNavigation(
                current = AppScreen.SETTINGS,
                onHome = onBack,
                onChat = onChat,
                onReminders = onReminders,
                onSettings = {}
            )
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(NahwerkSpacing.Xl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)
        ) {
            PremiumCard {
                SectionEyebrow("CONCIERGE")
                Text(home.concierge.name, style = MaterialTheme.typography.headlineSmall)
                Text("Stimme: ${home.concierge.voice}", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodyMedium)
            }
            PremiumCard {
                SectionEyebrow("ZENTRALER KONTEXT")
                MetricRow("Memory-Fakten", home.memoryCount.toString())
                HorizontalDivider(color = NahwerkPalette.Divider)
                MetricRow("Offene Vorgänge", home.openLoopCount.toString())
                Text(
                    "Diese Werte werden nur dargestellt. Die Business-Wahrheit verbleibt im zentralen Concierge Core.",
                    color = NahwerkPalette.SecondaryText,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch),
                shape = RoundedCornerShape(NahwerkRadii.Medium),
                border = BorderStroke(1.dp, NahwerkPalette.Divider)
            ) { Text("Sicher abmelden") }
            Text(
                "STAGING · Keine Production- oder Provider-Aktion durch diesen Test-Candidate.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

@Composable
private fun SimpleScreenHeader(title: String, onBack: () -> Unit) {
    Surface(color = NahwerkPalette.Surface) {
        Row(
            Modifier.fillMaxWidth().safeDrawingPadding().padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Sm),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
        ) {
            TextButton(
                onClick = onBack,
                modifier = Modifier.size(NahwerkSizes.Touch).semantics { contentDescription = "Zur Übersicht" },
                contentPadding = PaddingValues(0.dp)
            ) { Text("‹", color = NahwerkPalette.Gold, style = MaterialTheme.typography.headlineMedium) }
            Text(title, style = MaterialTheme.typography.titleLarge)
        }
    }
}

@Composable
private fun NahwerkBottomNavigation(
    current: AppScreen,
    onHome: () -> Unit,
    onChat: () -> Unit,
    onReminders: () -> Unit,
    onSettings: () -> Unit
) {
    Surface(color = NahwerkPalette.Surface, border = BorderStroke(1.dp, NahwerkPalette.Divider)) {
        Row(
            Modifier.fillMaxWidth().safeDrawingPadding().padding(horizontal = NahwerkSpacing.Xs, vertical = NahwerkSpacing.Xs),
            horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)
        ) {
            NavButton("⌂", "Übersicht", current == AppScreen.HOME, onHome, Modifier.weight(1f))
            NavButton("✦", "Concierge", current == AppScreen.CHAT, onChat, Modifier.weight(1f))
            NavButton("✓", "Erinnerungen", current == AppScreen.REMINDERS, onReminders, Modifier.weight(1f))
            NavButton("●", "Konto", current == AppScreen.SETTINGS, onSettings, Modifier.weight(1f))
        }
    }
}

@Composable
private fun NavButton(
    symbol: String,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    TextButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = 58.dp),
        shape = RoundedCornerShape(NahwerkRadii.Medium),
        colors = ButtonDefaults.textButtonColors(
            containerColor = if (selected) NahwerkPalette.GoldSoft else Color.Transparent,
            contentColor = if (selected) NahwerkPalette.Gold else NahwerkPalette.SecondaryText
        ),
        contentPadding = PaddingValues(horizontal = NahwerkSpacing.Xs, vertical = NahwerkSpacing.Sm)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(symbol, modifier = Modifier.semantics { contentDescription = label }, style = MaterialTheme.typography.titleMedium)
            Text(label, maxLines = 1, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun PremiumCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(NahwerkRadii.Large),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
        border = BorderStroke(1.dp, NahwerkPalette.Divider)
    ) {
        Column(
            Modifier.fillMaxWidth().padding(NahwerkSpacing.Xl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md),
            content = content
        )
    }
}

@Composable
private fun PrimaryButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Button(
        onClick = onClick,
        modifier = modifier.heightIn(min = NahwerkSizes.PrimaryTouch),
        shape = RoundedCornerShape(NahwerkRadii.Medium),
        colors = ButtonDefaults.buttonColors(
            containerColor = NahwerkPalette.Gold,
            contentColor = MaterialTheme.colorScheme.onPrimary
        )
    ) { Text(label) }
}

@Composable
private fun QuickActionButton(label: String, symbol: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.heightIn(min = 76.dp),
        shape = RoundedCornerShape(NahwerkRadii.Large),
        border = BorderStroke(1.dp, NahwerkPalette.Divider),
        contentPadding = PaddingValues(NahwerkSpacing.Md)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
            Text(symbol, color = NahwerkPalette.Gold, style = MaterialTheme.typography.titleLarge)
            Text(label, maxLines = 1, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
private fun MetricCard(value: String, label: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(NahwerkRadii.Large),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.ElevatedSurface)
    ) {
        Column(Modifier.padding(NahwerkSpacing.Lg), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
            Text(value, color = NahwerkPalette.Gold, style = MaterialTheme.typography.headlineSmall)
            Text(label, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelMedium)
        }
    }
}

@Composable
private fun MetricRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(label, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        Text(value, color = NahwerkPalette.Gold, style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
private fun SectionHeader(title: String, subtitle: String) {
    Column(verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        Text(subtitle, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun SectionEyebrow(text: String) {
    Text(text, color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
}

@Composable
private fun BrandWordmark() {
    Text("NAHWERK", color = NahwerkPalette.Gold, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
}

@Composable
private fun StatusChip(label: String, accent: Color) {
    Surface(
        shape = RoundedCornerShape(NahwerkRadii.Pill),
        color = accent.copy(alpha = 0.12f),
        border = BorderStroke(1.dp, accent.copy(alpha = 0.32f))
    ) {
        Text(
            label,
            color = accent,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Sm)
        )
    }
}

@Composable
private fun StatusDot(accent: Color, description: String) {
    Surface(
        modifier = Modifier.size(12.dp).semantics { contentDescription = description },
        shape = RoundedCornerShape(NahwerkRadii.Pill),
        color = accent
    ) {}
}

@Composable
private fun EmptyPanel(symbol: String, title: String, body: String) {
    PremiumCard {
        Surface(
            modifier = Modifier.size(46.dp),
            shape = RoundedCornerShape(NahwerkRadii.Pill),
            color = NahwerkPalette.GoldSoft
        ) { Box(contentAlignment = Alignment.Center) { Text(symbol, color = NahwerkPalette.Gold) } }
        Text(title, style = MaterialTheme.typography.titleLarge)
        Text(body, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun ErrorText(message: String) {
    Surface(
        modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Assertive }.testTag("error_message"),
        color = NahwerkPalette.Error.copy(alpha = 0.10f),
        shape = RoundedCornerShape(NahwerkRadii.Medium),
        border = BorderStroke(1.dp, NahwerkPalette.Error.copy(alpha = 0.32f))
    ) {
        Row(Modifier.padding(NahwerkSpacing.Md), horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
            Text("!", color = NahwerkPalette.Error, fontWeight = FontWeight.Bold)
            Text(message, color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatusText(message: String) {
    Surface(
        modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite }.testTag("status_message"),
        color = NahwerkPalette.Success.copy(alpha = 0.10f),
        shape = RoundedCornerShape(NahwerkRadii.Medium)
    ) {
        Text(message, color = NahwerkPalette.Success, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(NahwerkSpacing.Md))
    }
}

@Composable
private fun premiumInputColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = NahwerkPalette.Gold,
    unfocusedBorderColor = MaterialTheme.colorScheme.outline,
    disabledBorderColor = NahwerkPalette.Divider,
    focusedLabelColor = NahwerkPalette.Gold,
    cursorColor = NahwerkPalette.Gold,
    focusedContainerColor = NahwerkPalette.Background,
    unfocusedContainerColor = NahwerkPalette.Background,
    disabledContainerColor = NahwerkPalette.Background
)
