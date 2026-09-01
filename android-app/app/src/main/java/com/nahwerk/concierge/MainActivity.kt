package com.nahwerk.concierge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { NahwerkApp() }
    }
}

@Composable
fun NahwerkApp() {
    val nav = rememberNavController()
    MaterialTheme {
        NavHost(navController = nav, startDestination = "home") {
            composable("home") { HomeScreen({ nav.navigate("chat") }, { nav.navigate("reminders") }, { nav.navigate("settings") }) }
            composable("chat") { ConciergeScreen { nav.popBackStack() } }
            composable("reminders") { ReminderScreen { nav.popBackStack() } }
            composable("settings") { SettingsScreen { nav.popBackStack() } }
        }
    }
}

@Composable
private fun Page(title: String, onBack: (() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    Scaffold(topBar = { if (onBack != null) Button(onClick = onBack, modifier = Modifier.padding(12.dp)) { Text("Zurück") } }) { pad ->
        Column(Modifier.padding(pad).padding(20.dp).fillMaxSize().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(title, style = MaterialTheme.typography.headlineMedium)
            content()
        }
    }
}

@Composable
fun HomeScreen(openChat: () -> Unit, openReminders: () -> Unit, openSettings: () -> Unit) = Page("NAHWERK Concierge") {
    Text("Was kann ich für Sie tun?", style = MaterialTheme.typography.headlineLarge)
    Text("Einfach, persönlich und ohne unnötige Menüs.")
    Button(onClick = openChat, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) { Text("Nachricht an Nilo oder Mira") }
    OutlinedButton(onClick = openChat, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp).semantics { contentDescription = "Sprachnachricht vorbereiten" }) { Text("Sprache") }
    OutlinedButton(onClick = openChat, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) { Text("Foto oder Dokument") }
    OutlinedButton(onClick = openReminders, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) { Text("Erinnerungen") }
    TextButton(onClick = openSettings) { Text("Einstellungen") }
}

@Composable
fun ConciergeScreen(back: () -> Unit) = Page("Concierge", back) {
    Text("Text, Audio, Foto und Dokument sind hier als sichere UI-Einstiegspunkte vorbereitet.")
    Text("Backend noch nicht verbunden. Es werden keine Concierge-Antworten oder Action-Erfolge vorgetäuscht.")
    var draft by remember { mutableStateOf("") }
    OutlinedTextField(draft, { draft = it }, label = { Text("Ihre Nachricht") }, modifier = Modifier.fillMaxWidth(), minLines = 4)
    Button(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) { Text("Senden – Backend erforderlich") }
    OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) { Text("Sprachnachricht") }
    OutlinedButton(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp)) { Text("Foto / Dokument") }
}

@Composable
fun ReminderScreen(back: () -> Unit) = Page("Erinnerungen", back) {
    Text("Die bestehende Reminder-Source-of-Truth soll wiederverwendet werden. Lokal wird keine zweite Reminder-Datenbank angelegt.")
    Button(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth()) { Text("Erinnerung erstellen – Backend erforderlich") }
    Text("Noch keine verbundenen Erinnerungen.")
}

@Composable
fun SettingsScreen(back: () -> Unit) = Page("Einstellungen", back) {
    Text("Persönlicher Concierge")
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { AssistChip(onClick = {}, label = { Text("Nilo") }); AssistChip(onClick = {}, label = { Text("Mira") }) }
    Text("Anrede, Audio, Sprechgeschwindigkeit und Benachrichtigungen werden erst aktiv geschaltet, wenn die Backend-Verträge bestätigt sind.")
    HorizontalDivider()
    Text("Datenschutz · Konto · Logout")
}
