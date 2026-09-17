package com.nahwerk.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

private enum class GuestDestination {
    CHAT,
    EMAIL,
    SAFETY,
    USAGE,
    SETTINGS
}

@Composable
internal fun PublicChatFirstShell(
    onLogin: () -> Unit,
    onRegister: () -> Unit
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var destination by rememberSaveable { mutableStateOf(GuestDestination.CHAT) }
    var profileMenuExpanded by remember { mutableStateOf(false) }
    var chatGeneration by rememberSaveable { mutableIntStateOf(0) }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = true,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = NahwerkPalette.Surface,
                drawerContentColor = NahwerkPalette.PrimaryText,
                modifier = Modifier.width(292.dp)
            ) {
                Column(
                    Modifier.fillMaxHeight().padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Lg),
                    verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = NahwerkSpacing.Sm, vertical = NahwerkSpacing.Sm),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(NahwerkPalette.GoldSoft),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("N", color = NahwerkPalette.Gold, fontWeight = FontWeight.SemiBold)
                        }
                        Spacer(Modifier.width(NahwerkSpacing.Md))
                        Text("NAHWERK", color = NahwerkPalette.Gold, style = MaterialTheme.typography.titleMedium)
                    }

                    Button(
                        onClick = {
                            chatGeneration += 1
                            destination = GuestDestination.CHAT
                            scope.launch { drawerState.close() }
                        },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        shape = RoundedCornerShape(NahwerkRadii.Medium)
                    ) {
                        Text("＋  Neuer Chat")
                    }

                    Text(
                        "Chats",
                        color = NahwerkPalette.SecondaryText,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Xs)
                    )
                    NavigationDrawerItem(
                        label = { Text("Neuer Chat", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                        selected = destination == GuestDestination.CHAT,
                        onClick = {
                            destination = GuestDestination.CHAT
                            scope.launch { drawerState.close() }
                        }
                    )
                    Text(
                        "Deine gespeicherten Chats erscheinen nach der Anmeldung.",
                        color = NahwerkPalette.SecondaryText,
                        style = MaterialTheme.typography.bodySmall,
                        modifier = Modifier.padding(horizontal = NahwerkSpacing.Md)
                    )

                    Spacer(Modifier.weight(1f))

                    NavigationDrawerItem(
                        label = { Text("E-Mail") },
                        selected = destination == GuestDestination.EMAIL,
                        onClick = {
                            destination = GuestDestination.EMAIL
                            scope.launch { drawerState.close() }
                        }
                    )
                    NavigationDrawerItem(
                        label = { Text("Safety") },
                        selected = destination == GuestDestination.SAFETY,
                        onClick = {
                            destination = GuestDestination.SAFETY
                            scope.launch { drawerState.close() }
                        }
                    )
                    NavigationDrawerItem(
                        label = { Text("Nutzung") },
                        selected = destination == GuestDestination.USAGE,
                        onClick = {
                            destination = GuestDestination.USAGE
                            scope.launch { drawerState.close() }
                        }
                    )

                    Box {
                        Surface(
                            color = NahwerkPalette.ElevatedSurface,
                            shape = RoundedCornerShape(NahwerkRadii.Medium),
                            border = BorderStroke(1.dp, NahwerkPalette.Divider),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { profileMenuExpanded = true }
                                .testTag("guest_profile_menu")
                        ) {
                            Row(
                                Modifier.fillMaxWidth().padding(NahwerkSpacing.Md),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    Modifier
                                        .size(34.dp)
                                        .clip(CircleShape)
                                        .background(NahwerkPalette.GoldSoft),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("P", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelLarge)
                                }
                                Spacer(Modifier.width(NahwerkSpacing.Md))
                                Column(Modifier.weight(1f)) {
                                    Text("Profil", style = MaterialTheme.typography.bodyMedium)
                                    Text("Nicht angemeldet", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
                                }
                                Text("•••", color = NahwerkPalette.SecondaryText)
                            }
                        }
                        DropdownMenu(
                            expanded = profileMenuExpanded,
                            onDismissRequest = { profileMenuExpanded = false },
                            containerColor = NahwerkPalette.ElevatedSurface
                        ) {
                            DropdownMenuItem(
                                text = { Text("Einstellungen") },
                                onClick = {
                                    profileMenuExpanded = false
                                    destination = GuestDestination.SETTINGS
                                    scope.launch { drawerState.close() }
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Anmelden") },
                                onClick = {
                                    profileMenuExpanded = false
                                    onLogin()
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Kostenlos registrieren") },
                                onClick = {
                                    profileMenuExpanded = false
                                    onRegister()
                                }
                            )
                        }
                    }
                }
            }
        }
    ) {
        Surface(Modifier.fillMaxSize(), color = NahwerkPalette.Background) {
            Column(Modifier.fillMaxSize()) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .background(NahwerkPalette.Background)
                        .padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TextButton(
                        onClick = { scope.launch { drawerState.open() } },
                        modifier = Modifier.testTag("open_chat_drawer")
                    ) { Text("☰", color = NahwerkPalette.PrimaryText, style = MaterialTheme.typography.titleLarge) }
                    Spacer(Modifier.width(NahwerkSpacing.Sm))
                    Text(
                        when (destination) {
                            GuestDestination.CHAT -> "NAHWERK"
                            GuestDestination.EMAIL -> "E-Mail"
                            GuestDestination.SAFETY -> "Safety"
                            GuestDestination.USAGE -> "Nutzung"
                            GuestDestination.SETTINGS -> "Einstellungen"
                        },
                        style = MaterialTheme.typography.titleMedium,
                        color = NahwerkPalette.PrimaryText
                    )
                }

                when (destination) {
                    GuestDestination.CHAT -> GuestChatSurface(
                        key = chatGeneration,
                        onLogin = onLogin,
                        onRegister = onRegister
                    )
                    GuestDestination.EMAIL -> GuestAccountRequiredSurface(
                        title = "E-Mail",
                        body = "Deine E-Mail-Verbindungen gehören zu deinem persönlichen NAHWERK-Konto.",
                        onLogin = onLogin,
                        onRegister = onRegister
                    )
                    GuestDestination.SAFETY -> GuestAccountRequiredSurface(
                        title = "Safety",
                        body = "Safety-Einstellungen sind persönlich und werden erst nach sicherer Anmeldung geöffnet.",
                        onLogin = onLogin,
                        onRegister = onRegister
                    )
                    GuestDestination.USAGE -> GuestAccountRequiredSurface(
                        title = "Nutzung",
                        body = "Dein Tarif und deine Nutzung werden nach der Anmeldung aus deinem Kundenkonto geladen.",
                        onLogin = onLogin,
                        onRegister = onRegister
                    )
                    GuestDestination.SETTINGS -> GuestSettingsSurface(onLogin, onRegister)
                }
            }
        }
    }
}

@Composable
private fun GuestChatSurface(
    key: Int,
    onLogin: () -> Unit,
    onRegister: () -> Unit
) {
    var draft by rememberSaveable(key) { mutableStateOf("") }
    var showAccountGate by rememberSaveable(key) { mutableStateOf(false) }

    Column(
        Modifier.fillMaxSize().padding(horizontal = NahwerkSpacing.Lg),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.weight(1f))
        Text(
            "Wie kann ich dir helfen?",
            style = MaterialTheme.typography.headlineMedium,
            color = NahwerkPalette.PrimaryText
        )
        Spacer(Modifier.weight(1f))

        if (showAccountGate) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = NahwerkPalette.ElevatedSurface),
                border = BorderStroke(1.dp, NahwerkPalette.Divider),
                shape = RoundedCornerShape(NahwerkRadii.Medium)
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(NahwerkSpacing.Lg),
                    verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
                ) {
                    Text("Persönlichen Concierge starten", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Der Chat ist bereits offen. Für eine echte persönliche Antwort und einen gespeicherten Verlauf brauchst du ein kostenloses Konto.",
                        color = NahwerkPalette.SecondaryText,
                        style = MaterialTheme.typography.bodySmall
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                        TextButton(onClick = onLogin) { Text("Anmelden") }
                        Button(onClick = onRegister) { Text("Kostenlos starten") }
                    }
                }
            }
            Spacer(Modifier.size(NahwerkSpacing.Md))
        }

        Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = NahwerkSpacing.Lg),
            colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
            border = BorderStroke(1.dp, NahwerkPalette.Divider),
            shape = RoundedCornerShape(NahwerkRadii.Hero)
        ) {
            Column(Modifier.fillMaxWidth().padding(NahwerkSpacing.Md)) {
                OutlinedTextField(
                    value = draft,
                    onValueChange = {
                        draft = it.take(5000)
                        if (showAccountGate) showAccountGate = false
                    },
                    placeholder = { Text("Nachricht an NAHWERK") },
                    modifier = Modifier.fillMaxWidth().testTag("guest_chat_input"),
                    minLines = 1,
                    maxLines = 5
                )
                Row(
                    Modifier.fillMaxWidth().padding(top = NahwerkSpacing.Sm),
                    horizontalArrangement = Arrangement.End
                ) {
                    Button(
                        onClick = { showAccountGate = true },
                        enabled = draft.isNotBlank(),
                        modifier = Modifier.testTag("guest_chat_send")
                    ) { Text("Senden") }
                }
            }
        }
    }
}

@Composable
private fun GuestAccountRequiredSurface(
    title: String,
    body: String,
    onLogin: () -> Unit,
    onRegister: () -> Unit
) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(NahwerkSpacing.Xxl),
            colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
            border = BorderStroke(1.dp, NahwerkPalette.Divider),
            shape = RoundedCornerShape(NahwerkRadii.Large)
        ) {
            Column(
                Modifier.fillMaxWidth().padding(NahwerkSpacing.Xxl),
                verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
            ) {
                Text(title, style = MaterialTheme.typography.headlineSmall)
                Text(body, color = NahwerkPalette.SecondaryText)
                Button(onClick = onRegister, modifier = Modifier.fillMaxWidth()) { Text("Kostenlos registrieren") }
                TextButton(onClick = onLogin, modifier = Modifier.fillMaxWidth()) { Text("Anmelden") }
            }
        }
    }
}

@Composable
private fun GuestSettingsSurface(
    onLogin: () -> Unit,
    onRegister: () -> Unit
) {
    Column(
        Modifier.fillMaxSize().padding(NahwerkSpacing.Xxl),
        verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Lg)
    ) {
        Text("Einstellungen", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Die App verwendet das ruhige dunkle NAHWERK-Design. Persönliche Einstellungen werden nach der Anmeldung mit deinem Konto verbunden.",
            color = NahwerkPalette.SecondaryText
        )
        Surface(
            color = NahwerkPalette.Surface,
            shape = RoundedCornerShape(NahwerkRadii.Large),
            border = BorderStroke(1.dp, NahwerkPalette.Divider)
        ) {
            Column(
                Modifier.fillMaxWidth().padding(NahwerkSpacing.Lg),
                verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
            ) {
                Text("Konto", style = MaterialTheme.typography.titleMedium)
                Button(onClick = onRegister, modifier = Modifier.fillMaxWidth()) { Text("Kostenlos registrieren") }
                TextButton(onClick = onLogin, modifier = Modifier.fillMaxWidth()) { Text("Anmelden") }
            }
        }
    }
}
