package com.nahwerk.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.nahwerk.concierge.data.CustomerProfile
import com.nahwerk.concierge.data.FamilyInvitationInput
import com.nahwerk.concierge.data.FamilySnapshot
import com.nahwerk.concierge.data.MfaEnrollmentStart
import com.nahwerk.concierge.data.PaygSnapshot
import com.nahwerk.concierge.data.ProdCustomerApi
import com.nahwerk.concierge.data.ProdCustomerPolicy
import com.nahwerk.concierge.data.ProductAuthState
import com.nahwerk.concierge.data.RegistrationInput
import com.nahwerk.concierge.data.SafetyContact
import com.nahwerk.concierge.data.SafetySnapshot
import kotlinx.coroutines.launch

@Composable
internal fun ProdRegistrationSurface(onBack: () -> Unit) {
    val context = LocalContext.current
    val api = remember { ProdCustomerApi(context) }
    val scope = rememberCoroutineScope()
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordRepeat by remember { mutableStateOf("") }
    var requestId by remember { mutableStateOf<String?>(null) }
    var code by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var done by remember { mutableStateOf(false) }

    val input = RegistrationInput(firstName, lastName, email, phone, password)
    val canStart = !busy && firstName.isNotBlank() && lastName.isNotBlank() &&
        ProdCustomerPolicy.validEmail(email) && ProdCustomerPolicy.validRegistrationPassword(password) &&
        password == passwordRepeat

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(NahwerkSpacing.Xxl),
        verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)
    ) {
        TextButton(onClick = onBack, enabled = !busy) { Text("‹ Zur Anmeldung") }
        Text("NAHWERK Konto erstellen", style = MaterialTheme.typography.headlineMedium)
        Text(
            "FREE · 0 € / Monat. Die Registrierung läuft direkt gegen den bestätigten PROD-Vertrag.",
            color = NahwerkPalette.SecondaryText,
            style = MaterialTheme.typography.bodyMedium
        )
        ProdCard("REGISTRIERUNG") {
            if (done) {
                ProdOk("Dein Konto wurde bestätigt. Du kannst dich jetzt in der App anmelden.")
                Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Zur Anmeldung") }
            } else if (requestId == null) {
                ProdField(firstName, { firstName = it }, "Vorname", busy)
                ProdField(lastName, { lastName = it }, "Nachname", busy)
                ProdField(email, { email = it }, "E-Mail", busy)
                ProdField(phone, { phone = it }, "WhatsApp / Telefon", busy)
                ProdField(password, { password = it }, "Passwort · mindestens 15 Zeichen", busy, password = true)
                ProdField(passwordRepeat, { passwordRepeat = it }, "Passwort wiederholen", busy, password = true)
                if (passwordRepeat.isNotEmpty() && passwordRepeat != password) ProdError("Die Passwörter stimmen nicht überein.")
                Button(
                    onClick = {
                        busy = true; error = null
                        scope.launch {
                            val result = api.register(input)
                            busy = false
                            if (!result.ok) error = result.error
                            else if (result.status == "verification_required" && !result.requestId.isNullOrBlank()) requestId = result.requestId
                            else if (result.status == "web_account_linked" || result.status == "registered") done = true
                            else error = "Registrierung wurde nicht eindeutig abgeschlossen (${result.status})."
                        }
                    },
                    enabled = canStart,
                    modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch),
                    colors = ButtonDefaults.buttonColors(containerColor = NahwerkPalette.Gold)
                ) { if (busy) CircularProgressIndicator(Modifier.height(20.dp), strokeWidth = 2.dp) else Text("Kostenlos registrieren") }
            } else {
                Text("Bestätigungscode", style = MaterialTheme.typography.titleLarge)
                Text("Gib den sechsstelligen Code ein, den NAHWERK für diese Registrierung bestätigt hat.", color = NahwerkPalette.SecondaryText)
                ProdField(code, { code = it.filter(Char::isDigit).take(6) }, "6-stelliger Code", busy)
                Button(
                    onClick = {
                        busy = true; error = null
                        scope.launch {
                            val result = api.verifyRegistration(input, requireNotNull(requestId), code)
                            busy = false
                            if (result.ok && result.status == "web_account_linked") done = true
                            else error = result.error ?: "Code konnte nicht bestätigt werden (${result.status})."
                        }
                    },
                    enabled = !busy && ProdCustomerPolicy.validVerificationCode(code),
                    modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch)
                ) { Text("Code bestätigen") }
            }
            if (!error.isNullOrBlank()) ProdError(requireNotNull(error))
        }
    }
}

@Composable
internal fun ProdCustomerHub() {
    val context = LocalContext.current
    val api = remember { ProdCustomerApi(context) }
    val scope = rememberCoroutineScope()
    var auth by remember { mutableStateOf(api.pendingAuthState()) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var profile by remember { mutableStateOf<CustomerProfile?>(null) }
    var payg by remember { mutableStateOf<PaygSnapshot?>(null) }
    var safety by remember { mutableStateOf<SafetySnapshot?>(null) }
    var family by remember { mutableStateOf<FamilySnapshot?>(null) }

    fun reload() {
        if (!api.hasSession()) { auth = api.pendingAuthState(); return }
        loading = true; error = null
        scope.launch {
            val p = api.loadProfile()
            val g = api.loadPayg()
            val s = api.loadSafety()
            val f = api.loadFamily()
            profile = p.getOrNull() ?: profile
            payg = g.getOrNull() ?: payg
            safety = s.getOrNull() ?: safety
            family = f.getOrNull() ?: family
            error = listOfNotNull(
                p.exceptionOrNull()?.message,
                g.exceptionOrNull()?.message,
                s.exceptionOrNull()?.message,
                f.exceptionOrNull()?.message
            ).distinct().takeIf { it.isNotEmpty() }?.joinToString(" · ")
            auth = api.pendingAuthState()
            loading = false
        }
    }

    LaunchedEffect(Unit) { if (api.hasSession()) reload() }

    Column(verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text("Konto & Produkte", style = MaterialTheme.typography.titleLarge)
                Text("Echte PROD-Zustände", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
            }
            if (loading) CircularProgressIndicator(Modifier.height(24.dp), color = NahwerkPalette.Gold, strokeWidth = 2.dp)
        }

        if (!auth.authenticated) {
            ProductAuthGate(api = api, auth = auth, onAuthChange = { auth = it; if (it.authenticated) reload() })
            return@Column
        }

        if (auth.enrollmentRequired) {
            MfaEnrollmentCard(api) { auth = api.pendingAuthState(); reload() }
        }
        if (!error.isNullOrBlank()) ProdError(requireNotNull(error))
        profile?.let { ProfileCard(it, api, onUpdated = { profile = it }, onError = { error = it }) }
        payg?.let { PaygCard(it, api, onUpdated = { payg = it }, onError = { error = it }) }
        safety?.let { SafetyCard(it, api, onUpdated = { safety = it }, onError = { error = it }) }
        family?.let { FamilyCard(it, api, onUpdated = { family = it }, onError = { error = it }) }
        OutlinedButton(onClick = { reload() }, enabled = !loading, modifier = Modifier.fillMaxWidth()) { Text("PROD-Daten aktualisieren") }
    }
}

@Composable
private fun ProductAuthGate(api: ProdCustomerApi, auth: ProductAuthState, onAuthChange: (ProductAuthState) -> Unit) {
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf(auth.error) }
    ProdCard("SICHERE PROD-KONTOSITZUNG") {
        if (auth.mfaRequired) {
            Text("Zusätzliche Sicherheitsbestätigung", style = MaterialTheme.typography.titleLarge)
            val method = auth.mfaMethod
            if (method == "choice") {
                Text("Wähle die hinterlegte Bestätigungsmethode.", color = NahwerkPalette.SecondaryText)
                Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                    auth.mfaMethods.forEach { candidate ->
                        OutlinedButton(onClick = {
                            busy = true
                            scope.launch { val result = api.beginLoginMfa(candidate); busy = false; error = result.error; onAuthChange(result) }
                        }, enabled = !busy) { Text(if (candidate == "totp") "Authenticator" else candidate.uppercase()) }
                    }
                }
            } else {
                auth.maskedPhone?.let { Text("Code an $it", color = NahwerkPalette.SecondaryText) }
                ProdField(code, { code = it.filter(Char::isDigit).take(6) }, "6-stelliger Code", busy)
                Button(onClick = {
                    busy = true
                    scope.launch { val result = api.verifyLoginMfa(code); busy = false; error = result.error; onAuthChange(result) }
                }, enabled = !busy && code.length == 6, modifier = Modifier.fillMaxWidth()) { Text("Bestätigen") }
            }
        } else {
            Text("Konto-Produkte erneut verbinden", style = MaterialTheme.typography.titleLarge)
            Text("Dein Concierge bleibt angemeldet. Für sensible Konto-, PAYG-, Safety- und Family-Daten wird die separate PROD-Sitzung erneuert.", color = NahwerkPalette.SecondaryText)
            ProdField(email, { email = it }, "E-Mail", busy)
            ProdField(password, { password = it }, "Passwort", busy, password = true)
            Button(onClick = {
                busy = true; error = null
                scope.launch { val result = api.authenticate(email, password); busy = false; error = result.error; onAuthChange(result) }
            }, enabled = !busy && ProdCustomerPolicy.validEmail(email) && password.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("Sicher verbinden") }
        }
        if (!error.isNullOrBlank()) ProdError(requireNotNull(error))
    }
}

@Composable
private fun MfaEnrollmentCard(api: ProdCustomerApi, onDone: () -> Unit) {
    val scope = rememberCoroutineScope()
    var password by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var start by remember { mutableStateOf<MfaEnrollmentStart?>(null) }
    var recoveryCodes by remember { mutableStateOf<List<String>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    ProdCard("SICHERHEIT EINRICHTEN") {
        Text("Zwei-Faktor-Schutz erforderlich", style = MaterialTheme.typography.titleLarge)
        Text("Für Änderungen an persönlichen Daten und Safety verlangt PROD einmalig einen Authenticator-Faktor.", color = NahwerkPalette.SecondaryText)
        if (recoveryCodes.isNotEmpty()) {
            ProdOk("MFA ist aktiv. Bewahre die Wiederherstellungscodes sicher auf.")
            Text(recoveryCodes.joinToString("\n"), style = MaterialTheme.typography.bodySmall)
            Button(onClick = onDone, modifier = Modifier.fillMaxWidth()) { Text("Weiter") }
        } else if (start == null) {
            ProdField(password, { password = it }, "Passwort erneut eingeben", busy, password = true)
            Button(onClick = {
                busy = true; error = null
                scope.launch { val result = api.startTotpEnrollment(password); busy = false; start = result.takeIf { it.ok }; error = result.error }
            }, enabled = !busy && password.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("Authenticator einrichten") }
        } else {
            Text("Secret", fontWeight = FontWeight.SemiBold)
            Text(start?.secret.orEmpty(), color = NahwerkPalette.Gold, style = MaterialTheme.typography.bodySmall)
            Text("Füge dieses Secret in deiner Authenticator-App hinzu. Die URI wird nur auf diesem Gerät angezeigt.", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
            Text(start?.uri.orEmpty(), color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelSmall)
            ProdField(code, { code = it.filter(Char::isDigit).take(6) }, "6-stelliger Authenticator-Code", busy)
            Button(onClick = {
                val token = start?.enrollmentToken ?: return@Button
                busy = true; error = null
                scope.launch {
                    val result = api.verifyTotpEnrollment(token, code)
                    busy = false
                    if (result.ok) recoveryCodes = result.recoveryCodes else error = result.error
                }
            }, enabled = !busy && code.length == 6, modifier = Modifier.fillMaxWidth()) { Text("MFA aktivieren") }
        }
        if (!error.isNullOrBlank()) ProdError(requireNotNull(error))
    }
}

@Composable
private fun ProfileCard(profile: CustomerProfile, api: ProdCustomerApi, onUpdated: (CustomerProfile) -> Unit, onError: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var first by remember(profile.firstName) { mutableStateOf(profile.firstName) }
    var last by remember(profile.lastName) { mutableStateOf(profile.lastName) }
    var editing by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    ProdCard("PERSÖNLICHE DATEN") {
        Text(listOf(profile.firstName, profile.lastName).filter(String::isNotBlank).joinToString(" "), style = MaterialTheme.typography.titleLarge)
        Text(profile.email, color = NahwerkPalette.SecondaryText)
        if (profile.whatsappNumber.isNotBlank()) Text(profile.whatsappNumber, color = NahwerkPalette.SecondaryText)
        KeyValue("Kundennummer", profile.customerNumber.ifBlank { "—" })
        KeyValue("Tarif", profile.planName.ifBlank { profile.planCode.ifBlank { "—" } })
        if (profile.monthlyPriceCents != null) KeyValue("Monatspreis", ProdCustomerPolicy.euro(profile.monthlyPriceCents))
        if (profile.appDialoguesUsed != null && profile.appDialogueLimit != null) KeyValue("App-Nutzung", "${profile.appDialoguesUsed} / ${profile.appDialogueLimit}")
        if (profile.whatsappDialoguesUsed != null && profile.whatsappDialogueLimit != null) KeyValue("WhatsApp-Nutzung", "${profile.whatsappDialoguesUsed} / ${profile.whatsappDialogueLimit}")
        if (editing) {
            ProdField(first, { first = it }, "Vorname", busy)
            ProdField(last, { last = it }, "Nachname", busy)
            Button(onClick = {
                busy = true
                scope.launch {
                    api.updateProfile(first, last).onSuccess(onUpdated).onFailure { onError(it.message ?: "Profil konnte nicht gespeichert werden.") }
                    busy = false; editing = false
                }
            }, enabled = !busy && first.isNotBlank(), modifier = Modifier.fillMaxWidth()) { Text("Speichern") }
        } else OutlinedButton(onClick = { editing = true }, modifier = Modifier.fillMaxWidth()) { Text("Name bearbeiten") }
        Text("E-Mail und WhatsApp werden nur aus PROD angezeigt; dafür existiert aktuell kein freigegebener Editiervertrag.", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun PaygCard(snapshot: PaygSnapshot, api: ProdCustomerApi, onUpdated: (PaygSnapshot) -> Unit, onError: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    ProdCard("PAYG · KOSTEN & NUTZUNG") {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(if (snapshot.enabled) "PAYG aktiv" else "PAYG nicht aktiv", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            Text(if (snapshot.billingBlocked) "GESPERRT" else "PROD", color = if (snapshot.billingBlocked) NahwerkPalette.Error else NahwerkPalette.Success)
        }
        KeyValue("Verfügbar", ProdCustomerPolicy.euro(snapshot.availableCents, snapshot.currency))
        KeyValue("Guthaben", ProdCustomerPolicy.euro(snapshot.balanceCents, snapshot.currency))
        if (snapshot.reservedCents != 0L) KeyValue("Reserviert", ProdCustomerPolicy.euro(snapshot.reservedCents, snapshot.currency))
        snapshot.dailyLimitCents?.let { KeyValue("Tageslimit", ProdCustomerPolicy.euro(it, snapshot.currency)) }
        snapshot.monthlyLimitCents?.let { KeyValue("Monatslimit", ProdCustomerPolicy.euro(it, snapshot.currency)) }
        if (!snapshot.billingBlocked) {
            Button(onClick = {
                busy = true
                scope.launch {
                    api.setPaygEnabled(!snapshot.enabled).onSuccess(onUpdated).onFailure { onError(it.message ?: "PAYG konnte nicht geändert werden.") }
                    busy = false
                }
            }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text(if (snapshot.enabled) "PAYG deaktivieren" else "PAYG aktivieren") }
        } else ProdError(snapshot.billingBlockedReason ?: "PAYG ist serverseitig gesperrt.")
        HorizontalDivider(color = NahwerkPalette.Divider)
        Text("Zahlungsmethoden", style = MaterialTheme.typography.titleMedium)
        if (snapshot.paymentMethods.isEmpty()) Text("Keine bestätigte Zahlungsmethode hinterlegt.", color = NahwerkPalette.SecondaryText)
        snapshot.paymentMethods.forEach { method ->
            KeyValue(method.brand?.uppercase() ?: method.methodType, "•••• ${method.last4 ?: "—"}${if (method.isDefault) " · Standard" else ""}")
        }
        if (snapshot.paymentMethods.isEmpty()) {
            Text(
                if (snapshot.setupAvailable) "Stripe-Setup ist serverseitig bereit. Für die native Bestätigung fehlt der App noch der veröffentlichte Stripe-Publishable-Key/Client-Contract."
                else "Der Zahlungsanbieter meldet Setup derzeit nicht als verfügbar.",
                color = NahwerkPalette.Warning,
                style = MaterialTheme.typography.bodySmall
            )
        }
        HorizontalDivider(color = NahwerkPalette.Divider)
        Text("Letzte PAYG-Nutzung", style = MaterialTheme.typography.titleMedium)
        if (snapshot.usage.isEmpty()) Text("Noch keine bestätigte PAYG-Nutzung.", color = NahwerkPalette.SecondaryText)
        snapshot.usage.take(5).forEach { item ->
            val cost = item.actualCost?.let { "${"%.4f".format(it)} ${item.currency}" } ?: "Kosten offen"
            KeyValue(item.rateCode.ifBlank { "Nutzung" }, "$cost · ${item.quantity} ${item.unit}")
        }
        snapshot.quotes.take(3).forEach { quote -> KeyValue("Auftrag · ${quote.status}", ProdCustomerPolicy.euro(quote.amountCents, quote.currency)) }
    }
}

@Composable
private fun SafetyCard(snapshot: SafetySnapshot, api: ProdCustomerApi, onUpdated: (SafetySnapshot) -> Unit, onError: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var enabled by remember(snapshot.enabled) { mutableStateOf(snapshot.enabled) }
    var times by remember(snapshot.checkinTimes) { mutableStateOf(snapshot.checkinTimes.joinToString(", ")) }
    var contacts by remember(snapshot.contacts) {
        mutableStateOf(snapshot.contacts.joinToString("\n") { "${it.name} | ${it.phone} | ${it.relationship}" })
    }
    var busy by remember { mutableStateOf(false) }
    ProdCard("SAFETY") {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(if (enabled) "Safety aktiv" else "Safety deaktiviert", style = MaterialTheme.typography.titleLarge)
                snapshot.nextCheckinAt?.let { Text("Nächster Check-in: $it", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall) }
            }
            Switch(checked = enabled, onCheckedChange = { enabled = it }, enabled = snapshot.canWrite && !busy)
        }
        ProdField(times, { times = it }, "Zeiten · z. B. 09:00, 18:00", busy || !snapshot.canWrite)
        ProdField(contacts, { contacts = it }, "Kontakte · Name | Telefon | Beziehung · eine Zeile je Kontakt", busy || !snapshot.canWrite, minLines = 3)
        Button(onClick = {
            val parsedTimes = times.split(',').map(String::trim).filter(String::isNotBlank)
            val parsedContacts = contacts.lines().mapNotNull { line ->
                val p = line.split('|').map(String::trim)
                if (p.size >= 2 && p[0].isNotBlank() && p[1].isNotBlank()) SafetyContact(p[0], p[1], p.getOrElse(2) { "" }) else null
            }
            busy = true
            scope.launch {
                api.saveSafety(snapshot.copy(enabled = enabled, checkinTimes = parsedTimes, contacts = parsedContacts))
                    .onSuccess(onUpdated).onFailure { onError(it.message ?: "Safety konnte nicht gespeichert werden.") }
                busy = false
            }
        }, enabled = snapshot.canWrite && !busy, modifier = Modifier.fillMaxWidth()) { Text("Safety speichern") }
        Text("Maximal 4 Check-in-Zeiten. Safety-Zustand und Kontakte werden ausschließlich aus PROD gelesen bzw. dorthin gespeichert.", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun FamilyCard(snapshot: FamilySnapshot, api: ProdCustomerApi, onUpdated: (FamilySnapshot) -> Unit, onError: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var showInvite by remember { mutableStateOf(false) }
    ProdCard("FAMILY") {
        Text("Berechtigungen", style = MaterialTheme.typography.titleLarge)
        if (snapshot.actors.isEmpty()) Text("Keine weiteren Family-Akteure bestätigt.", color = NahwerkPalette.SecondaryText)
        snapshot.actors.forEach { actor ->
            Text("${actor.displayName} · ${actor.role}", fontWeight = FontWeight.SemiBold)
            Row(horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                OutlinedButton(onClick = {
                    busy = true
                    scope.launch {
                        api.setFamilyPermission(actor.actorPersonId, "manage_preferences", !actor.managePreferences)
                            .onSuccess(onUpdated).onFailure { onError(it.message ?: "Berechtigung konnte nicht geändert werden.") }
                        busy = false
                    }
                }, enabled = !busy) { Text(if (actor.managePreferences) "Präferenzen entziehen" else "Präferenzen erlauben") }
            }
            OutlinedButton(onClick = {
                busy = true
                scope.launch {
                    api.setFamilyPermission(actor.actorPersonId, "manage_safety", !actor.manageSafety)
                        .onSuccess(onUpdated).onFailure { onError(it.message ?: "Berechtigung konnte nicht geändert werden.") }
                    busy = false
                }
            }, enabled = !busy, modifier = Modifier.fillMaxWidth()) { Text(if (actor.manageSafety) "Safety entziehen" else "Safety erlauben") }
            HorizontalDivider(color = NahwerkPalette.Divider)
        }
        Text("Verwaltete Personen", style = MaterialTheme.typography.titleMedium)
        if (snapshot.managedPeople.isEmpty()) Text("Keine verwalteten Personen.", color = NahwerkPalette.SecondaryText)
        snapshot.managedPeople.forEach { person -> KeyValue(person.displayName, "${person.relationship} · ${person.status}") }
        Text("Einladungen", style = MaterialTheme.typography.titleMedium)
        snapshot.invitations.forEach { invite ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("${invite.firstName} ${invite.lastName}", fontWeight = FontWeight.SemiBold)
                    Text("${invite.relationship} · ${invite.state}", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.bodySmall)
                }
                if (invite.state !in setOf("ACCEPTED", "DECLINED", "REVOKED", "EXPIRED")) {
                    TextButton(onClick = {
                        busy = true
                        scope.launch {
                            api.revokeFamilyInvitation(invite.id).onSuccess(onUpdated).onFailure { onError(it.message ?: "Einladung konnte nicht widerrufen werden.") }
                            busy = false
                        }
                    }, enabled = !busy) { Text("Widerrufen") }
                }
            }
        }
        OutlinedButton(onClick = { showInvite = !showInvite }, modifier = Modifier.fillMaxWidth()) { Text(if (showInvite) "Einladung schließen" else "Person einladen") }
        if (showInvite) FamilyInviteForm(api, busy, onBusy = { busy = it }, onUpdated, onError)
    }
}

@Composable
private fun FamilyInviteForm(
    api: ProdCustomerApi,
    busy: Boolean,
    onBusy: (Boolean) -> Unit,
    onUpdated: (FamilySnapshot) -> Unit,
    onError: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var first by remember { mutableStateOf("") }
    var last by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var relationship by remember { mutableStateOf("MOTHER") }
    var language by remember { mutableStateOf("de") }
    var consent by remember { mutableStateOf(false) }
    ProdField(first, { first = it }, "Vorname", busy)
    ProdField(last, { last = it }, "Nachname", busy)
    ProdField(phone, { phone = it }, "WhatsApp-Nummer", busy)
    ProdField(relationship, { relationship = it.uppercase() }, "Beziehung · z. B. MOTHER, FATHER, PARTNER, RELATIVE", busy)
    ProdField(language, { language = it }, "Sprache · z. B. de, tr, en", busy)
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Switch(checked = consent, onCheckedChange = { consent = it }, enabled = !busy)
        Spacer(Modifier.height(4.dp))
        Text("Ich bestätige die Einwilligung zur Kontaktaufnahme.", modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
    }
    Button(onClick = {
        onBusy(true)
        scope.launch {
            api.createFamilyInvitation(
                FamilyInvitationInput(first, last, relationship, phone, language, contactConsentAttested = consent)
            ).onSuccess(onUpdated).onFailure { onError(it.message ?: "Einladung konnte nicht erstellt werden.") }
            onBusy(false)
        }
    }, enabled = !busy && first.isNotBlank() && last.isNotBlank() && phone.isNotBlank() && consent, modifier = Modifier.fillMaxWidth()) {
        Text("Einladung erstellen")
    }
    Text("Der echte Versand wird ausschließlich durch den bestehenden PROD-Family-Vertrag ausgelöst – nicht durch lokale Ersatzlogik.", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelSmall)
}

@Composable
private fun ProdCard(eyebrow: String, content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(NahwerkRadii.Large),
        colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
        border = BorderStroke(1.dp, NahwerkPalette.Divider)
    ) {
        Column(Modifier.fillMaxWidth().padding(NahwerkSpacing.Xl), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)) {
            Text(eyebrow, color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
            content()
        }
    }
}

@Composable
private fun ProdField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    disabled: Boolean,
    password: Boolean = false,
    minLines: Int = 1
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth(),
        enabled = !disabled,
        minLines = minLines,
        maxLines = if (minLines > 1) 6 else 1,
        visualTransformation = if (password) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
        shape = RoundedCornerShape(NahwerkRadii.Medium)
    )
}

@Composable
private fun KeyValue(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)) {
        Text(label, color = NahwerkPalette.SecondaryText, modifier = Modifier.weight(1f), style = MaterialTheme.typography.bodySmall)
        Text(value, style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
private fun ProdError(message: String) {
    Card(colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Error.copy(alpha = .10f)), border = BorderStroke(1.dp, NahwerkPalette.Error.copy(alpha = .3f))) {
        Text(message, color = NahwerkPalette.Error, modifier = Modifier.fillMaxWidth().padding(NahwerkSpacing.Md), style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun ProdOk(message: String) {
    Card(colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Success.copy(alpha = .10f))) {
        Text(message, color = NahwerkPalette.Success, modifier = Modifier.fillMaxWidth().padding(NahwerkSpacing.Md), style = MaterialTheme.typography.bodySmall)
    }
}
