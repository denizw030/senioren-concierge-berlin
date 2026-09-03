package com.nahwerk.concierge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.nahwerk.concierge.data.ChatMessage
import com.nahwerk.concierge.data.HomeContext
import com.nahwerk.concierge.data.NahwerkApi
import com.nahwerk.concierge.data.PendingChatRequest
import com.nahwerk.concierge.data.PendingChatStore
import com.nahwerk.concierge.data.Reminder
import com.nahwerk.concierge.data.SecureSessionStore
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class Screen { LOGIN, HOME, CHAT, REMINDERS, SETTINGS }

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { NahwerkApp() }
    }
}

@Composable
fun NahwerkApp() {
    val appContext = LocalContext.current.applicationContext
    val sessions = remember { SecureSessionStore(appContext) }
    val pendingChats = remember { PendingChatStore(appContext) }
    val api = remember { NahwerkApi(sessions, pendingChats) }
    val scope = rememberCoroutineScope()

    var screen by remember { mutableStateOf(if (api.hasSession()) Screen.HOME else Screen.LOGIN) }
    var home by remember { mutableStateOf<HomeContext?>(null) }
    var loading by remember { mutableStateOf(api.hasSession()) }
    var loginBusy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun loadHome() {
        scope.launch {
            loading = true
            error = null
            api.loadHome()
                .onSuccess {
                    home = it
                    screen = Screen.HOME
                }
                .onFailure {
                    if (!api.hasSession()) screen = Screen.LOGIN
                    error = it.message
                }
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        if (api.hasSession()) loadHome()
    }

    MaterialTheme {
        when {
            loading && home == null && screen != Screen.LOGIN -> LoadingScreen()
            screen == Screen.LOGIN -> LoginScreen(
                busy = loginBusy,
                error = error,
                onLogin = { email, password ->
                    scope.launch {
                        loginBusy = true
                        error = null
                        val result = api.login(email, password)
                        loginBusy = false
                        if (result.ok) loadHome() else error = result.error
                    }
                },
                onReset = { email ->
                    scope.launch {
                        val ok = api.requestPasswordReset(email)
                        error = if (ok) "Wenn die Adresse registriert ist, wurde eine Rücksetz-E-Mail angefordert." else "Die Anfrage konnte nicht gesendet werden."
                    }
                }
            )
            home == null -> LoadingScreen()
            screen == Screen.HOME -> HomeScreen(
                home = home!!,
                onChat = { screen = Screen.CHAT },
                onReminders = { screen = Screen.REMINDERS },
                onSettings = { screen = Screen.SETTINGS },
                onRefresh = { loadHome() }
            )
            screen == Screen.CHAT -> ChatScreen(home!!, api) {
                loadHome()
                screen = Screen.HOME
            }
            screen == Screen.REMINDERS -> ReminderScreen(home!!.reminders) { screen = Screen.HOME }
            screen == Screen.SETTINGS -> SettingsScreen(
                home = home!!,
                onBack = { screen = Screen.HOME },
                onLogout = {
                    api.logout()
                    home = null
                    error = null
                    screen = Screen.LOGIN
                }
            )
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
private fun LoginScreen(
    busy: Boolean,
    error: String?,
    onLogin: (String, String) -> Unit,
    onReset: (String) -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFFF8F6F1), Color(0xFFEDE8DD))
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Card(
            Modifier
                .fillMaxWidth()
                .padding(24.dp),
            shape = RoundedCornerShape(28.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.94f))
        ) {
            Column(
                Modifier.padding(28.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text("NAHWERK", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.SemiBold)
                Text("PERSÖNLICHER CONCIERGE", style = MaterialTheme.typography.labelLarge)
                Spacer(Modifier.height(4.dp))
                Text("Anmelden", style = MaterialTheme.typography.headlineSmall)
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("E-Mail") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Passwort") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Button(
                    onClick = { onLogin(email, password) },
                    enabled = !busy && email.isNotBlank() && password.length >= 8,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp)
                ) {
                    if (busy) CircularProgressIndicator(modifier = Modifier.height(22.dp).width(22.dp))
                    else Text("Sicher anmelden")
                }
                TextButton(onClick = { if (email.isNotBlank()) onReset(email) }) {
                    Text("Passwort zurücksetzen")
                }
                if (!error.isNullOrBlank()) {
                    Text(error, style = MaterialTheme.typography.bodySmall)
                }
                Text(
                    "STAGING · Testversion · Zugangsdaten werden verschlüsselt auf dem Gerät gespeichert.",
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }
}

@Composable
private fun HomeScreen(
    home: HomeContext,
    onChat: () -> Unit,
    onReminders: () -> Unit,
    onSettings: () -> Unit,
    onRefresh: () -> Unit
) {
    Scaffold { padding ->
        LazyColumn(
            Modifier
                .padding(padding)
                .fillMaxSize()
                .background(Color(0xFFF7F5F0)),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Column(Modifier.padding(start = 18.dp, end = 18.dp, top = 18.dp)) {
                    Text("NAHWERK", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                    Text("Persönlicher Concierge", style = MaterialTheme.typography.bodyMedium)
                }
            }
            item {
                ConciergePresence(home = home, modifier = Modifier.padding(horizontal = 18.dp))
            }
            item {
                Column(
                    Modifier.padding(horizontal = 18.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(onClick = onChat, modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp)) {
                        Text("${home.concierge.name} öffnen")
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        OutlinedButton(onClick = onReminders, modifier = Modifier.weight(1f)) {
                            Text("Erinnerungen")
                        }
                        OutlinedButton(onClick = onSettings, modifier = Modifier.weight(1f)) {
                            Text("Konto & Memory")
                        }
                    }
                    TextButton(onClick = onRefresh, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                        Text("Kontext aktualisieren")
                    }
                    Text(
                        "${home.memoryCount} gemerkte Fakten · ${home.openLoopCount} offene Vorgänge · ${home.reminders.size} Erinnerungen",
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
    var entered by remember(home.concierge.id) { mutableStateOf(false) }
    LaunchedEffect(home.concierge.id) {
        delay(180)
        entered = true
    }
    val scale by animateFloatAsState(
        targetValue = if (entered) 1f else 0.86f,
        animationSpec = tween(durationMillis = 900),
        label = "conciergeScale"
    )
    val offset by animateFloatAsState(
        targetValue = if (entered) 0f else 48f,
        animationSpec = tween(durationMillis = 900),
        label = "conciergeOffset"
    )

    Box(
        modifier
            .fillMaxWidth()
            .height(520.dp)
            .clip(RoundedCornerShape(32.dp))
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFFEEE8DD), Color(0xFFD7D0C3), Color(0xFFB9B1A4))
                )
            )
    ) {
        AsyncImage(
            model = home.concierge.imageUrl,
            contentDescription = "${home.concierge.name}, persönlicher NAHWERK Concierge",
            contentScale = ContentScale.Fit,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxHeight(0.86f)
                .fillMaxWidth()
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                    translationY = offset
                }
        )
        Card(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(22.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.92f))
        ) {
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text(home.concierge.name, fontWeight = FontWeight.SemiBold)
                Text(home.greeting, style = MaterialTheme.typography.titleMedium)
                Text("Ich denke mit und behalte relevante offene Punkte im Blick.", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun ChatScreen(home: HomeContext, api: NahwerkApi, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    val messages = remember(home.concierge.id) {
        mutableStateListOf(ChatMessage("assistant", home.greeting))
    }
    var draft by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var pendingRequest by remember { mutableStateOf(api.pendingChatRequest()) }

    fun sendRequest(request: PendingChatRequest, ensureUserBubble: Boolean) {
        if (sending) return
        if (ensureUserBubble && messages.none { it.role == "user" && it.text == request.message }) {
            messages.add(ChatMessage("user", request.message))
        }
        sending = true
        error = null
        scope.launch {
            val result = api.sendText(request)
            sending = false
            if (result.ok && !result.text.isNullOrBlank()) {
                pendingRequest = null
                messages.add(ChatMessage("assistant", result.text))
            } else {
                pendingRequest = api.pendingChatRequest() ?: request
                error = result.error ?: "Keine Antwort erhalten. Dieselbe Nachricht kann sicher erneut gesendet werden."
            }
        }
    }

    Scaffold(
        topBar = {
            Row(
                Modifier.fillMaxWidth().padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onBack) { Text("Zurück") }
                Spacer(Modifier.width(8.dp))
                Text(home.concierge.name, fontWeight = FontWeight.SemiBold)
            }
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            LazyColumn(
                Modifier.weight(1f).fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(messages) { message ->
                    MessageBubble(message)
                }
            }

            pendingRequest?.let { pending ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF4D8))
                ) {
                    Column(
                        Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Nicht bestätigte Nachricht", fontWeight = FontWeight.SemiBold)
                        Text(pending.message, style = MaterialTheme.typography.bodySmall)
                        Text(
                            "Ein Retry verwendet exakt dieselbe Nachrichten-ID und erzeugt keinen neuen Concierge-Turn.",
                            style = MaterialTheme.typography.labelSmall
                        )
                        OutlinedButton(
                            onClick = { sendRequest(pending, ensureUserBubble = true) },
                            enabled = !sending,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(if (sending) "Erneuter Versand läuft …" else "Sicher erneut senden")
                        }
                    }
                }
            }

            if (!error.isNullOrBlank()) Text(error!!, style = MaterialTheme.typography.bodySmall)

            OutlinedTextField(
                value = draft,
                onValueChange = { if (it.length <= 4000) draft = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Nachricht an ${home.concierge.name}") },
                minLines = 2,
                maxLines = 5,
                enabled = pendingRequest == null
            )
            Button(
                onClick = {
                    val text = draft.trim()
                    if (text.isEmpty() || pendingRequest != null) return@Button
                    val request = try {
                        api.createChatRequest(text)
                    } catch (e: Exception) {
                        error = e.message ?: "Nachricht konnte nicht vorbereitet werden."
                        return@Button
                    }
                    pendingRequest = request
                    messages.add(ChatMessage("user", request.message))
                    draft = ""
                    sendRequest(request, ensureUserBubble = false)
                },
                enabled = !sending && draft.isNotBlank() && pendingRequest == null,
                modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp)
            ) {
                if (sending) Text("${home.concierge.name} denkt …") else Text("Senden")
            }
            Text(
                "Text ist mit dem echten NAHWERK-Staging-Concierge verbunden. Nicht bestätigte Sends bleiben verschlüsselt auf dem Gerät gespeichert und werden beim Retry mit derselben ID wiederverwendet.",
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage) {
    val isUser = message.role == "user"
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(0.86f),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(
                containerColor = if (isUser) Color(0xFFE6E0D5) else Color(0xFFF4F2ED)
            )
        ) {
            Text(message.text, modifier = Modifier.padding(14.dp))
        }
    }
}

@Composable
private fun ReminderScreen(reminders: List<Reminder>, onBack: () -> Unit) {
    Scaffold(
        topBar = { TextButton(onClick = onBack, modifier = Modifier.padding(12.dp)) { Text("Zurück") } }
    ) { padding ->
        LazyColumn(
            Modifier.padding(padding).fillMaxSize().padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            item {
                Text("Erinnerungen", style = MaterialTheme.typography.headlineMedium)
                Text("Die App liest direkt aus der bestehenden NAHWERK-Reminder-Quelle.")
            }
            if (reminders.isEmpty()) {
                item { Text("Aktuell keine Erinnerungen.") }
            } else {
                items(reminders) { reminder ->
                    Card(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(14.dp)) {
                            Text(reminder.title, fontWeight = FontWeight.Medium)
                            if (!reminder.dueAt.isNullOrBlank()) Text(reminder.dueAt, style = MaterialTheme.typography.bodySmall)
                            Text(reminder.status, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(home: HomeContext, onBack: () -> Unit, onLogout: () -> Unit) {
    Scaffold(
        topBar = { TextButton(onClick = onBack, modifier = Modifier.padding(12.dp)) { Text("Zurück") } }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text("Konto & Memory", style = MaterialTheme.typography.headlineMedium)
            Text("Persönlicher Concierge: ${home.concierge.name}")
            Text("Stimme: ${home.concierge.voice}")
            HorizontalDivider()
            Text("${home.memoryCount} aktive Memory-Fakten")
            Text("${home.openLoopCount} offene Vorgänge")
            Text("Der Server berücksichtigt Uhrzeit, offene Vorgänge, Erinnerungen und freigegebene Memory-Fakten für die Begrüßung.")
            HorizontalDivider()
            OutlinedButton(onClick = onLogout, modifier = Modifier.fillMaxWidth()) {
                Text("Sicher abmelden")
            }
            Text("STAGING · Keine Production-Datenbankänderung durch diese App.", style = MaterialTheme.typography.labelSmall)
        }
    }
}
