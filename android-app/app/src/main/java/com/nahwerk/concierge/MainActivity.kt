package com.nahwerk.concierge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
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

private val NahwerkBlack = Color(0xFF08090A)
private val NahwerkSurface = Color(0xFF121315)
private val NahwerkRaised = Color(0xFF1A1B1E)
private val NahwerkGold = Color(0xFFD0AE68)
private val NahwerkMuted = Color(0xFFB9B6AF)
private val NahwerkError = Color(0xFFFFB4AB)

private val NahwerkColors = darkColorScheme(
    primary = NahwerkGold,
    onPrimary = Color(0xFF221A0C),
    background = NahwerkBlack,
    onBackground = Color(0xFFF5F2EC),
    surface = NahwerkSurface,
    onSurface = Color(0xFFF5F2EC),
    surfaceVariant = NahwerkRaised,
    onSurfaceVariant = NahwerkMuted,
    error = NahwerkError
)

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

    MaterialTheme(colorScheme = NahwerkColors) {
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
            state.screen == AppScreen.REMINDERS -> ReminderScreen(requireNotNull(state.home).reminders, viewModel::goHome)
            state.screen == AppScreen.SETTINGS -> SettingsScreen(requireNotNull(state.home), viewModel::goHome, viewModel::logout)
            else -> LoadingScreen()
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(Modifier.fillMaxSize().background(NahwerkBlack).testTag("loading_screen"), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = NahwerkGold, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
    }
}

@Composable
private fun ContextLoadErrorScreen(error: String, onRetry: () -> Unit, onLogout: () -> Unit) {
    Column(
        Modifier.fillMaxSize().background(NahwerkBlack).safeDrawingPadding().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("NAHWERK", color = NahwerkGold, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(18.dp))
        ErrorText(error)
        Spacer(Modifier.height(18.dp))
        Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Text("Erneut versuchen") }
        TextButton(onClick = onLogout) { Text("Abmelden") }
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

    Column(
        Modifier.fillMaxSize()
            .background(Brush.verticalGradient(listOf(NahwerkBlack, Color(0xFF11100D))))
            .safeDrawingPadding().imePadding().verticalScroll(rememberScrollState()).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Card(
            Modifier.fillMaxWidth().widthIn(max = 560.dp),
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(containerColor = NahwerkSurface)
        ) {
            Column(Modifier.padding(26.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("NAHWERK", color = NahwerkGold, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
                Text("PERSÖNLICHER CONCIERGE", color = NahwerkMuted, style = MaterialTheme.typography.labelLarge)
                Text("Anmelden", style = MaterialTheme.typography.headlineSmall)
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("E-Mail") },
                    modifier = Modifier.fillMaxWidth().testTag("login_email"),
                    singleLine = true,
                    enabled = !busy,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next)
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Passwort") },
                    modifier = Modifier.fillMaxWidth().testTag("login_password"),
                    singleLine = true,
                    enabled = !busy,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { if (canLogin) onLogin(email, password) })
                )
                Button(
                    onClick = { onLogin(email, password) },
                    enabled = canLogin,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp).testTag("login_submit")
                ) {
                    if (busy) CircularProgressIndicator(Modifier.height(22.dp).width(22.dp), strokeWidth = 2.dp)
                    else Text("Sicher anmelden")
                }
                TextButton(
                    onClick = { onReset(email) },
                    enabled = !busy && email.isNotBlank(),
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                ) { Text("Passwort zurücksetzen") }
                if (!error.isNullOrBlank()) ErrorText(error)
                if (!notice.isNullOrBlank()) StatusText(notice)
                Text(
                    "STAGING · Testversion · Sitzungstoken werden verschlüsselt auf dem Gerät gespeichert.",
                    color = NahwerkMuted,
                    style = MaterialTheme.typography.labelSmall
                )
            }
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
    Scaffold(containerColor = NahwerkBlack, modifier = Modifier.testTag("home_screen")) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize().safeDrawingPadding(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                Column(Modifier.padding(start = 18.dp, end = 18.dp, top = 18.dp)) {
                    Text("NAHWERK", color = NahwerkGold, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                    Text("Persönlicher Concierge", color = NahwerkMuted)
                }
            }
            item { ConciergePresence(home, Modifier.padding(horizontal = 18.dp)) }
            item {
                Column(Modifier.padding(horizontal = 18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = onChat, modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp).testTag("open_chat")) {
                        Text("${home.concierge.name} öffnen")
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(onClick = onReminders, modifier = Modifier.weight(1f).heightIn(min = 52.dp)) { Text("Erinnerungen") }
                        OutlinedButton(onClick = onSettings, modifier = Modifier.weight(1f).heightIn(min = 52.dp)) { Text("Konto") }
                    }
                    TextButton(onClick = onRefresh, enabled = !refreshing, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                        Text(if (refreshing) "Aktualisiere …" else "Kontext aktualisieren")
                    }
                    if (!error.isNullOrBlank()) ErrorText(error)
                    Text(
                        "${home.memoryCount} gemerkte Fakten · ${home.openLoopCount} offene Vorgänge · ${home.reminders.size} Erinnerungen",
                        color = NahwerkMuted,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
            item { Spacer(Modifier.height(24.dp)) }
        }
    }
}

@Composable
private fun ConciergePresence(home: HomeContext, modifier: Modifier = Modifier) {
    Box(
        modifier.fillMaxWidth().height(500.dp).clip(RoundedCornerShape(30.dp))
            .background(Brush.verticalGradient(listOf(Color(0xFF29251D), Color(0xFF151515), NahwerkBlack)))
    ) {
        AsyncImage(
            model = home.concierge.imageUrl,
            contentDescription = "${home.concierge.name}, persönlicher NAHWERK Concierge",
            contentScale = ContentScale.Fit,
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxHeight(0.86f).fillMaxWidth()
        )
        Card(
            modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(16.dp),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = NahwerkSurface.copy(alpha = 0.95f))
        ) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(home.concierge.name, color = NahwerkGold, fontWeight = FontWeight.SemiBold)
                Text(home.greeting, style = MaterialTheme.typography.titleMedium)
                Text("Ein Concierge. Dasselbe Gespräch. Derselbe zentrale Core.", color = NahwerkMuted, style = MaterialTheme.typography.bodySmall)
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
    Scaffold(
        containerColor = NahwerkBlack,
        modifier = Modifier.testTag("chat_screen"),
        topBar = {
            Row(
                Modifier.fillMaxWidth().background(NahwerkSurface).safeDrawingPadding().padding(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onBack, modifier = Modifier.heightIn(min = 48.dp)) { Text("Zurück") }
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(home.concierge.name, color = NahwerkGold, fontWeight = FontWeight.SemiBold)
                    Text("Persönlicher Concierge", color = NahwerkMuted, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().imePadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            LazyColumn(Modifier.weight(1f).fillMaxWidth().testTag("chat_messages"), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(messages, key = { it.sourceMessageId ?: "${it.role}:${it.text.hashCode()}" }) { MessageBubble(it) }
            }
            pendingRequest?.let { pending ->
                Card(Modifier.fillMaxWidth().testTag("pending_request"), colors = CardDefaults.cardColors(containerColor = Color(0xFF282216))) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Noch nicht bestätigt", color = NahwerkGold, fontWeight = FontWeight.SemiBold)
                        Text(pending.message, style = MaterialTheme.typography.bodySmall)
                        Text(
                            "Retry verwendet exakt dieselbe Nachrichten-ID; es wird kein neuer Client-Request erzeugt.",
                            color = NahwerkMuted,
                            style = MaterialTheme.typography.labelSmall
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = onRetry,
                                enabled = !sending,
                                modifier = Modifier.weight(1f).heightIn(min = 48.dp).testTag("pending_retry")
                            ) { Text(if (sending) "Retry läuft …" else "Sicher erneut") }
                            TextButton(
                                onClick = onDiscard,
                                enabled = !sending,
                                modifier = Modifier.heightIn(min = 48.dp).testTag("pending_discard")
                            ) { Text("Verwerfen") }
                        }
                    }
                }
            }
            if (!error.isNullOrBlank()) ErrorText(error)
            OutlinedTextField(
                value = draft,
                onValueChange = onDraftChange,
                modifier = Modifier.fillMaxWidth().testTag("chat_input"),
                label = { Text("Nachricht an ${home.concierge.name}") },
                minLines = 2,
                maxLines = 5,
                enabled = pendingRequest == null && !sending,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { if (draft.isNotBlank() && pendingRequest == null && !sending) onSend() })
            )
            Button(
                onClick = onSend,
                enabled = !sending && draft.isNotBlank() && pendingRequest == null,
                modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp).testTag("chat_send")
            ) { Text(if (sending) "${home.concierge.name} denkt …" else "Senden") }
            Text(
                "Text läuft ausschließlich über den bestehenden NAHWERK-Backend/Core-Contract. Die App trifft keine eigene Intent-, Approval- oder Task-Entscheidung.",
                color = NahwerkMuted,
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage) {
    val isUser = message.role == "user"
    Row(Modifier.fillMaxWidth(), horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start) {
        Card(
            modifier = Modifier.fillMaxWidth(0.86f),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = if (isUser) Color(0xFF2A251B) else NahwerkRaised)
        ) { Text(message.text, modifier = Modifier.padding(14.dp)) }
    }
}

@Composable
internal fun ReminderScreen(reminders: List<Reminder>, onBack: () -> Unit) {
    Scaffold(
        containerColor = NahwerkBlack,
        topBar = { TextButton(onClick = onBack, modifier = Modifier.safeDrawingPadding().padding(10.dp).heightIn(min = 48.dp)) { Text("Zurück") } }
    ) { padding ->
        LazyColumn(Modifier.padding(padding).fillMaxSize().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Text("Erinnerungen", color = NahwerkGold, style = MaterialTheme.typography.headlineMedium)
                Text("Anzeige aus dem bestätigten bestehenden Mobile-Contract.", color = NahwerkMuted)
            }
            if (reminders.isEmpty()) item { Text("Aktuell keine Erinnerungen.") }
            else items(reminders, key = { it.id }) { reminder ->
                Card(Modifier.fillMaxWidth(), colors = CardDefaults.cardColors(containerColor = NahwerkSurface)) {
                    Column(Modifier.padding(14.dp)) {
                        Text(reminder.title, fontWeight = FontWeight.Medium)
                        if (!reminder.dueAt.isNullOrBlank()) Text(reminder.dueAt, color = NahwerkMuted, style = MaterialTheme.typography.bodySmall)
                        Text(reminder.status, color = NahwerkMuted, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}

@Composable
internal fun SettingsScreen(home: HomeContext, onBack: () -> Unit, onLogout: () -> Unit) {
    Scaffold(
        containerColor = NahwerkBlack,
        topBar = { TextButton(onClick = onBack, modifier = Modifier.safeDrawingPadding().padding(10.dp).heightIn(min = 48.dp)) { Text("Zurück") } }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("Konto", color = NahwerkGold, style = MaterialTheme.typography.headlineMedium)
            Text("Persönlicher Concierge: ${home.concierge.name}")
            Text("Stimme: ${home.concierge.voice}")
            HorizontalDivider()
            Text("${home.memoryCount} aktive Memory-Fakten")
            Text("${home.openLoopCount} offene Vorgänge")
            Text("Diese Werte werden nur dargestellt. Die Business-Wahrheit verbleibt im zentralen Concierge Core.", color = NahwerkMuted)
            HorizontalDivider()
            OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth().heightIn(min = 52.dp)) { Text("Sicher abmelden") }
            Text("STAGING · Keine Production-Aktion oder Provider-Aktion durch diese App-Finalisierung.", color = NahwerkMuted, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun ErrorText(message: String) {
    Text(
        message,
        color = NahwerkError,
        style = MaterialTheme.typography.bodySmall,
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Assertive }.testTag("error_message")
    )
}

@Composable
private fun StatusText(message: String) {
    Text(
        message,
        color = NahwerkMuted,
        style = MaterialTheme.typography.bodySmall,
        modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite }.testTag("status_message")
    )
}
