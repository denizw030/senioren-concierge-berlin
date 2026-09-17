package com.nahwerk.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.nahwerk.concierge.data.ProdCustomerApi
import com.nahwerk.concierge.data.ProdCustomerPolicy
import com.nahwerk.concierge.data.RegistrationInput
import kotlinx.coroutines.launch

@Composable
internal fun FreeRegistrationSurface(onBackToLogin: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val api = remember { ProdCustomerApi(context) }
    val scope = rememberCoroutineScope()
    var firstName by rememberSaveable { mutableStateOf("") }
    var lastName by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var passwordRepeat by rememberSaveable { mutableStateOf("") }
    var requestId by rememberSaveable { mutableStateOf<String?>(null) }
    var code by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var done by rememberSaveable { mutableStateOf(false) }

    val input = RegistrationInput(firstName, lastName, email, phone, password)
    val canStart = !busy && firstName.isNotBlank() && lastName.isNotBlank() &&
        ProdCustomerPolicy.validEmail(email) && ProdCustomerPolicy.validRegistrationPassword(password) &&
        password == passwordRepeat

    Surface(Modifier.fillMaxSize(), color = NahwerkPalette.Background) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(NahwerkSpacing.Xxl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)
        ) {
            TextButton(onClick = onBackToLogin, enabled = !busy) { Text("‹ Zur Anmeldung") }
            Text("NAHWERK", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelLarge)
            Text("Kostenlos starten", style = MaterialTheme.typography.headlineMedium)
            Text(
                "FREE · 0 € / Monat · keine Kreditkarte erforderlich.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.bodyLarge
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(NahwerkRadii.Large),
                colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
                border = BorderStroke(1.dp, NahwerkPalette.Divider)
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(NahwerkSpacing.Xl),
                    verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
                ) {
                    if (done) {
                        Text("Dein Konto ist bereit.", style = MaterialTheme.typography.titleLarge)
                        Text("Du kannst dich jetzt mit deinen Zugangsdaten anmelden.", color = NahwerkPalette.SecondaryText)
                        Button(onClick = onBackToLogin, modifier = Modifier.fillMaxWidth()) { Text("Zur Anmeldung") }
                    } else if (requestId == null) {
                        RegistrationField(firstName, { firstName = it }, "Vorname", busy)
                        RegistrationField(lastName, { lastName = it }, "Nachname", busy)
                        RegistrationField(email, { email = it }, "E-Mail", busy)
                        RegistrationField(phone, { phone = it }, "WhatsApp / Telefon", busy)
                        RegistrationField(password, { password = it }, "Passwort · mindestens 15 Zeichen", busy, password = true)
                        RegistrationField(passwordRepeat, { passwordRepeat = it }, "Passwort wiederholen", busy, password = true)
                        if (passwordRepeat.isNotEmpty() && passwordRepeat != password) {
                            Text("Die Passwörter stimmen nicht überein.", color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
                        }
                        Button(
                            onClick = {
                                busy = true
                                error = null
                                scope.launch {
                                    val result = api.register(input)
                                    busy = false
                                    when {
                                        !result.ok -> error = registrationCustomerError(result.error)
                                        result.status == "verification_required" && !result.requestId.isNullOrBlank() -> requestId = result.requestId
                                        result.status == "web_account_linked" || result.status == "registered" -> done = true
                                        else -> error = "Die Registrierung konnte noch nicht abgeschlossen werden. Bitte erneut versuchen."
                                    }
                                }
                            },
                            enabled = canStart,
                            modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch)
                        ) {
                            if (busy) CircularProgressIndicator(strokeWidth = 2.dp) else Text("Kostenlos registrieren")
                        }
                    } else {
                        Text("E-Mail bestätigen", style = MaterialTheme.typography.titleLarge)
                        Text("Gib den sechsstelligen Bestätigungscode ein.", color = NahwerkPalette.SecondaryText)
                        RegistrationField(code, { code = it.filter(Char::isDigit).take(6) }, "6-stelliger Code", busy)
                        Button(
                            onClick = {
                                val currentRequestId = requestId ?: return@Button
                                busy = true
                                error = null
                                scope.launch {
                                    val result = api.verifyRegistration(input, currentRequestId, code)
                                    busy = false
                                    if (result.ok && (result.status == "web_account_linked" || result.status == "registered")) {
                                        done = true
                                    } else {
                                        error = registrationCustomerError(result.error)
                                    }
                                }
                            },
                            enabled = !busy && ProdCustomerPolicy.validVerificationCode(code),
                            modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch)
                        ) { if (busy) CircularProgressIndicator(strokeWidth = 2.dp) else Text("Code bestätigen") }
                    }

                    error?.let { Text(it, color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall) }
                }
            }

            Text(
                "Nach der Anmeldung werden deine persönlichen Daten, Verläufe und Nutzung ausschließlich deinem Kundenkonto zugeordnet.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun RegistrationField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    busy: Boolean,
    password: Boolean = false
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        enabled = !busy,
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
        visualTransformation = if (password) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None
    )
}

private fun registrationCustomerError(raw: String?): String {
    val text = raw.orEmpty()
    return when {
        text.contains("Passwort", ignoreCase = true) -> text
        text.contains("E-Mail", ignoreCase = true) -> text
        text.contains("Code", ignoreCase = true) -> text
        else -> "Die Registrierung konnte gerade nicht abgeschlossen werden. Bitte erneut versuchen."
    }
}
