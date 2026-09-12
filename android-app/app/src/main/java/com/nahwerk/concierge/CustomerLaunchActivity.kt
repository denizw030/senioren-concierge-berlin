package com.nahwerk.concierge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.nahwerk.concierge.data.ProdCustomerApi
import com.nahwerk.concierge.data.ProdCustomerPolicy
import com.nahwerk.concierge.data.ProductAuthState
import kotlinx.coroutines.launch

/**
 * Customer PROD launch shell.
 *
 * Authentication uses the canonical PROD customer-account session. Home,
 * Concierge and Reminders use the authoritative APP/core-v1 gateway. Account,
 * PAYG, payment, Safety and Family continue to use their published PROD contracts.
 */
class CustomerLaunchActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { CustomerLaunchRoot() }
    }
}

@Composable
internal fun CustomerLaunchRoot() {
    val context = LocalContext.current
    val productApi = remember { ProdCustomerApi(context) }
    var auth by remember { mutableStateOf(productApi.pendingAuthState()) }
    var registration by rememberSaveable { mutableStateOf(false) }

    NahwerkTheme {
        when {
            registration -> Surface(Modifier.fillMaxSize(), color = NahwerkPalette.Background) {
                ProdRegistrationSurface(onBack = {
                    registration = false
                    auth = productApi.pendingAuthState()
                })
            }
            !auth.authenticated -> Surface(Modifier.fillMaxSize(), color = NahwerkPalette.Background) {
                ProdLaunchLoginSurface(
                    api = productApi,
                    auth = auth,
                    onAuthChange = { auth = it },
                    onRegister = { registration = true }
                )
            }
            else -> CustomerAccountScreen(
                onLogout = {
                    productApi.clearLocalSession()
                    auth = productApi.pendingAuthState()
                }
            )
        }
    }
}

@Composable
private fun ProdLaunchLoginSurface(
    api: ProdCustomerApi,
    auth: ProductAuthState,
    onAuthChange: (ProductAuthState) -> Unit,
    onRegister: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var code by rememberSaveable { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember(auth.error) { mutableStateOf(auth.error) }

    Column(
        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(NahwerkSpacing.Xxl),
        verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)
    ) {
        Text("NAHWERK", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelLarge)
        Text("Dein persönlicher Concierge", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Sichere Anmeldung an deinem echten NAHWERK-PROD-Konto.",
            color = NahwerkPalette.SecondaryText,
            style = MaterialTheme.typography.bodyMedium
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
                if (auth.mfaRequired) {
                    Text("Sicherheitsbestätigung", style = MaterialTheme.typography.titleLarge)
                    if (auth.mfaMethod == "choice") {
                        Text("Wähle deine hinterlegte Bestätigungsmethode.", color = NahwerkPalette.SecondaryText)
                        auth.mfaMethods.forEach { method ->
                            OutlinedButton(
                                onClick = {
                                    busy = true
                                    error = null
                                    scope.launch {
                                        val result = api.beginLoginMfa(method)
                                        busy = false
                                        error = result.error
                                        onAuthChange(result)
                                    }
                                },
                                enabled = !busy,
                                modifier = Modifier.fillMaxWidth()
                            ) { Text(if (method == "totp") "Authenticator" else method.uppercase()) }
                        }
                    } else {
                        auth.maskedPhone?.let { Text("Code an $it", color = NahwerkPalette.SecondaryText) }
                        OutlinedTextField(
                            value = code,
                            onValueChange = { code = it.filter(Char::isDigit).take(6) },
                            label = { Text("6-stelliger Code") },
                            enabled = !busy,
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                        Button(
                            onClick = {
                                busy = true
                                error = null
                                scope.launch {
                                    val result = api.verifyLoginMfa(code)
                                    busy = false
                                    error = result.error
                                    onAuthChange(result)
                                }
                            },
                            enabled = !busy && code.length == 6,
                            modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch)
                        ) { Text("Bestätigen") }
                    }
                } else {
                    Text("Anmelden", style = MaterialTheme.typography.titleLarge)
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("E-Mail") },
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Passwort") },
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation()
                    )
                    Button(
                        onClick = {
                            busy = true
                            error = null
                            scope.launch {
                                val result = api.authenticate(email, password)
                                busy = false
                                error = result.error
                                onAuthChange(result)
                            }
                        },
                        enabled = !busy && ProdCustomerPolicy.validEmail(email) && password.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch)
                    ) {
                        if (busy) CircularProgressIndicator(strokeWidth = 2.dp)
                        else Text("Sicher anmelden")
                    }
                }

                if (!error.isNullOrBlank()) {
                    Text(requireNotNull(error), color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = NahwerkPalette.Surface.copy(alpha = 0.96f),
            shape = RoundedCornerShape(NahwerkRadii.Pill),
            border = BorderStroke(1.dp, NahwerkPalette.Divider)
        ) {
            TextButton(
                onClick = onRegister,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth().testTag("registration_open")
            ) { Text("Noch kein Konto? Kostenlos registrieren", color = NahwerkPalette.Gold) }
        }
    }
}

@Composable
private fun CustomerAccountScreen(onLogout: () -> Unit) {
    Scaffold(
        containerColor = NahwerkPalette.Background,
        topBar = {
            Surface(color = NahwerkPalette.Surface, border = BorderStroke(1.dp, NahwerkPalette.Divider)) {
                Row(
                    Modifier.fillMaxWidth().safeDrawingPadding().padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("NAHWERK", style = MaterialTheme.typography.titleLarge)
                        Text("ECHTES PROD-KONTO", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    ) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(NahwerkSpacing.Xl),
            verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xl)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(NahwerkRadii.Large),
                colors = CardDefaults.cardColors(containerColor = NahwerkPalette.ElevatedSurface),
                border = BorderStroke(1.dp, NahwerkPalette.Divider)
            ) {
                Column(Modifier.fillMaxWidth().padding(NahwerkSpacing.Lg), verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Xs)) {
                    Text("KUNDENKONTO", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                    Text("Nur bestätigte PROD-Zustände", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Profil, Concierge, Erinnerungen, Nutzung, PAYG, Zahlungsmethoden, Safety und Family werden direkt aus veröffentlichten PROD-Verträgen geladen.",
                        color = NahwerkPalette.SecondaryText,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            AppProdGatewaySurface(onSessionExpired = onLogout)
            ProdCustomerHub()
            PaygQuoteApprovalSurface()
            PaymentMethodProdSurface()

            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, NahwerkPalette.Gold),
                contentPadding = PaddingValues(NahwerkSpacing.Md)
            ) { Text("Abmelden") }
        }
    }
}
