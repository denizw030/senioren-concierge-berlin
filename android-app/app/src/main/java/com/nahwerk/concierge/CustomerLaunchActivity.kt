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
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel

/**
 * Customer launch shell.
 *
 * It intentionally delegates the already-GREEN Home/Concierge/Reminder runtime
 * back to NahwerkApp and only takes ownership of the two missing customer entry
 * surfaces: registration before login and the real PROD account/product hub.
 */
class CustomerLaunchActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { CustomerLaunchRoot() }
    }
}

@Composable
internal fun CustomerLaunchRoot(viewModel: NahwerkAppViewModel = viewModel()) {
    val state by viewModel.uiState.collectAsState()
    var registration by rememberSaveable { mutableStateOf(false) }

    when {
        state.screen == AppScreen.LOGIN -> {
            NahwerkTheme {
                if (registration) {
                    Surface(Modifier.fillMaxSize(), color = NahwerkPalette.Background) {
                        ProdRegistrationSurface(onBack = { registration = false })
                    }
                } else {
                    Box(Modifier.fillMaxSize()) {
                        LoginScreen(
                            busy = state.loginBusy,
                            error = state.error,
                            notice = state.notice,
                            onLogin = viewModel::login,
                            onReset = viewModel::requestPasswordReset
                        )
                        Surface(
                            modifier = Modifier.align(Alignment.BottomCenter).safeDrawingPadding().padding(bottom = 6.dp),
                            color = NahwerkPalette.Surface.copy(alpha = 0.96f),
                            shape = RoundedCornerShape(NahwerkRadii.Pill),
                            border = BorderStroke(1.dp, NahwerkPalette.Divider)
                        ) {
                            TextButton(
                                onClick = { registration = true },
                                enabled = !state.loginBusy,
                                modifier = Modifier.testTag("registration_open")
                            ) { Text("Noch kein Konto? Kostenlos registrieren", color = NahwerkPalette.Gold) }
                        }
                    }
                }
            }
        }
        state.screen == AppScreen.SETTINGS && state.home != null -> {
            NahwerkTheme {
                BackHandler { viewModel.goHome() }
                CustomerAccountScreen(
                    conciergeName = state.home?.concierge?.name.orEmpty(),
                    onBack = viewModel::goHome,
                    onLogout = viewModel::logout
                )
            }
        }
        else -> NahwerkApp(viewModel)
    }
}

@Composable
private fun CustomerAccountScreen(
    conciergeName: String,
    onBack: () -> Unit,
    onLogout: () -> Unit
) {
    Scaffold(
        containerColor = NahwerkPalette.Background,
        topBar = {
            Surface(color = NahwerkPalette.Surface, border = BorderStroke(1.dp, NahwerkPalette.Divider)) {
                Row(
                    Modifier.fillMaxWidth().safeDrawingPadding().padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Sm),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(NahwerkSpacing.Md)
                ) {
                    TextButton(onClick = onBack, modifier = Modifier.padding(0.dp)) {
                        Text("‹", color = NahwerkPalette.Gold, style = MaterialTheme.typography.headlineMedium)
                    }
                    Column(Modifier.weight(1f)) {
                        Text("Konto", style = MaterialTheme.typography.titleLarge)
                        Text("PROD · $conciergeName", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelSmall)
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
                    Text("ECHTES KUNDENKONTO", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                    Text("Nur bestätigte PROD-Zustände", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Profil, Nutzung, PAYG, Safety und Family werden direkt aus den veröffentlichten PROD-Verträgen geladen. Unbekannte Zustände bleiben gesperrt.",
                        color = NahwerkPalette.SecondaryText,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            ProdCustomerHub()

            OutlinedButton(
                onClick = onLogout,
                modifier = Modifier.fillMaxWidth(),
                border = BorderStroke(1.dp, NahwerkPalette.Gold),
                contentPadding = PaddingValues(NahwerkSpacing.Md)
            ) { Text("Abmelden") }
        }
    }
}
