package com.nahwerk.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp

private enum class PublicSection {
    OVERVIEW,
    CONCIERGE,
    SAFETY,
    FEATURES,
    FREE
}

@Composable
internal fun PublicEntrySurface(
    onLogin: () -> Unit,
    onRegister: () -> Unit
) {
    var section by remember { mutableStateOf(PublicSection.OVERVIEW) }

    Surface(Modifier.fillMaxSize(), color = NahwerkPalette.Background) {
        Column(
            Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(NahwerkSpacing.Xl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
                Text("NAHWERK", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelLarge)
                Text("Dein persönlicher Concierge", style = MaterialTheme.typography.headlineMedium)
                Text(
                    "Organisation, Kommunikation und Unterstützung in einer App – persönlich, verständlich und auf Wunsch kanalübergreifend.",
                    color = NahwerkPalette.SecondaryText,
                    style = MaterialTheme.typography.bodyLarge
                )
            }

            Card(
                modifier = Modifier.fillMaxWidth().testTag("public_menu"),
                shape = RoundedCornerShape(NahwerkRadii.Large),
                colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
                border = BorderStroke(1.dp, NahwerkPalette.Divider)
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(NahwerkSpacing.Lg),
                    verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)
                ) {
                    Text("MENÜ", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                    PublicMenuButton("Übersicht", section == PublicSection.OVERVIEW) { section = PublicSection.OVERVIEW }
                    PublicMenuButton("Persönlicher Concierge", section == PublicSection.CONCIERGE) { section = PublicSection.CONCIERGE }
                    PublicMenuButton("Safety", section == PublicSection.SAFETY) { section = PublicSection.SAFETY }
                    PublicMenuButton("Leistungen & Funktionen", section == PublicSection.FEATURES) { section = PublicSection.FEATURES }
                    PublicMenuButton("FREE & Tarife", section == PublicSection.FREE) { section = PublicSection.FREE }
                }
            }

            when (section) {
                PublicSection.OVERVIEW -> PublicInfoCard(
                    eyebrow = "ÜBERSICHT",
                    title = "NAHWERK hilft dir im Alltag",
                    body = "Du kannst Aufgaben besprechen, Dinge organisieren, Erinnerungen festhalten und deinen Concierge für persönliche Abläufe nutzen. Private Inhalte werden erst nach deiner Anmeldung deinem Kundenkonto zugeordnet."
                )
                PublicSection.CONCIERGE -> PublicInfoCard(
                    eyebrow = "CONCIERGE",
                    title = "Ein Ansprechpartner für viele Aufgaben",
                    body = "Der persönliche Concierge hilft beim Planen, Formulieren, Organisieren und bei freigegebenen Ausführungen. Nach dem Login nutzt die App den für dein Konto zentral ausgewählten Concierge."
                )
                PublicSection.SAFETY -> PublicInfoCard(
                    eyebrow = "SAFETY",
                    title = "Da sein, auch wenn Sie nicht da sein können.",
                    body = "Safety kann vereinbarte Check-ins und hinterlegte Kontakte berücksichtigen. Persönliche Safety-Zeiten und Kontakte sind ausschließlich nach Anmeldung sichtbar."
                )
                PublicSection.FEATURES -> PublicInfoCard(
                    eyebrow = "LEISTUNGEN",
                    title = "Mehr als nur Chat",
                    body = "Concierge, Erinnerungen, E-Mail-Unterstützung, Safety und die Verbindung deiner freigegebenen NAHWERK-Kanäle gehören zur Produktwelt. Welche Funktionen verfügbar sind, richtet sich nach deinem zentralen Tarif und deinen Berechtigungen."
                )
                PublicSection.FREE -> PublicInfoCard(
                    eyebrow = "FREE",
                    title = "Kostenlos starten – ohne Kreditkarte",
                    body = "Mit einem kostenlosen Konto kannst du den bestehenden NAHWERK FREE-Tarif nutzen. Deine tatsächlichen Limits und Verbrauchswerte kommen nach dem Login direkt aus deinem Kundenkonto; die App erfindet keine eigenen Kontingente."
                )
            }

            Button(
                onClick = onRegister,
                modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch).testTag("public_register")
            ) { Text("Kostenlos registrieren") }

            OutlinedButton(
                onClick = onLogin,
                modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch).testTag("public_login")
            ) { Text("Anmelden") }

            Text(
                "Ohne Anmeldung werden keine persönlichen Verläufe, Kontodaten, Nutzungskontingente oder privaten Aktionen angezeigt.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun PublicMenuButton(label: String, selected: Boolean, onClick: () -> Unit) {
    if (selected) {
        Button(onClick = onClick, modifier = Modifier.fillMaxWidth()) { Text(label) }
    } else {
        TextButton(onClick = onClick, modifier = Modifier.fillMaxWidth()) { Text(label) }
    }
}

@Composable
private fun PublicInfoCard(eyebrow: String, title: String, body: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(NahwerkRadii.Large),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.ElevatedSurface),
        border = BorderStroke(1.dp, NahwerkPalette.Divider)
    ) {
        Column(
            Modifier.fillMaxWidth().padding(NahwerkSpacing.Xl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)
        ) {
            Text(eyebrow, color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
            Text(title, style = MaterialTheme.typography.titleLarge)
            Text(body, color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodyMedium)
        }
    }
}
