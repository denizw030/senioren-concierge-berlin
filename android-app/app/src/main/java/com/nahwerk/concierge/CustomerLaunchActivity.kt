package com.nahwerk.concierge

import android.graphics.Color as AndroidColor
import android.os.Bundle
import android.view.View
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.nahwerk.concierge.data.ProdCustomerApi
import com.nahwerk.concierge.data.ProdCustomerPolicy
import com.nahwerk.concierge.data.ProductAuthState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class CustomerLaunchActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setLaunchSystemBars(splash = true)
        setContent {
            CustomerLaunchExperience(
                onSplashCompleted = { setLaunchSystemBars(splash = false) }
            )
        }
    }

    @Suppress("DEPRECATION")
    private fun setLaunchSystemBars(splash: Boolean) {
        val customerBackground = AndroidColor.rgb(255, 253, 248)
        window.statusBarColor = if (splash) AndroidColor.BLACK else customerBackground
        window.navigationBarColor = if (splash) AndroidColor.BLACK else customerBackground

        val lightSystemBars =
            View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        val currentFlags = window.decorView.systemUiVisibility
        window.decorView.systemUiVisibility = if (splash) {
            currentFlags and lightSystemBars.inv()
        } else {
            currentFlags or lightSystemBars
        }
    }
}

@Composable
private fun CustomerLaunchExperience(onSplashCompleted: () -> Unit) {
    var showSplash by rememberSaveable { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        if (showSplash) {
            delay(850)
            showSplash = false
            delay(260)
        }
        onSplashCompleted()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        CustomerLaunchRoot()

        AnimatedVisibility(
            visible = showSplash,
            enter = EnterTransition.None,
            exit = fadeOut(animationSpec = tween(durationMillis = 260))
        ) {
            NahwerkSplashScreen()
        }
    }
}

@Composable
private fun NahwerkSplashScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(R.drawable.nahwerk_brand_coin_dimmed),
            contentDescription = null,
            modifier = Modifier
                .fillMaxWidth(0.53f)
                .widthIn(max = 190.dp)
                .aspectRatio(1f),
            contentScale = ContentScale.Fit
        )
    }
}

private enum class PublicRoute {
    HOME,
    LOGIN,
    REGISTER
}

@Composable
internal fun CustomerLaunchRoot() {
    val context = LocalContext.current
    val productApi = remember { ProdCustomerApi(context) }
    var auth by remember { mutableStateOf(productApi.pendingAuthState()) }
    var route by rememberSaveable { mutableStateOf(PublicRoute.HOME) }

    NahwerkTheme {
        if (auth.authenticated) {
            CustomerAppShell(
                onLogout = {
                    productApi.clearLocalSession()
                    auth = productApi.pendingAuthState()
                    route = PublicRoute.HOME
                }
            )
        } else {
            when (route) {
                PublicRoute.HOME -> PublicEntrySurface(
                    onLogin = { route = PublicRoute.LOGIN },
                    onRegister = { route = PublicRoute.REGISTER }
                )
                PublicRoute.LOGIN -> Surface(Modifier.fillMaxSize(), color = NahwerkPalette.Background) {
                    CustomerLoginSurface(
                        api = productApi,
                        auth = auth,
                        onAuthChange = { auth = it },
                        onBack = { route = PublicRoute.HOME },
                        onRegister = { route = PublicRoute.REGISTER }
                    )
                }
                PublicRoute.REGISTER -> FreeRegistrationSurface(
                    onBackToLogin = {
                        auth = productApi.pendingAuthState()
                        route = PublicRoute.LOGIN
                    }
                )
            }
        }
    }
}

@Composable
private fun CustomerLoginSurface(
    api: ProdCustomerApi,
    auth: ProductAuthState,
    onAuthChange: (ProductAuthState) -> Unit,
    onBack: () -> Unit,
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
        TextButton(onClick = onBack, enabled = !busy) { Text("‹ Zur Übersicht") }
        Text("NAHWERK", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelLarge)
        Text("Anmelden", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Melde dich sicher an, um deinen persönlichen Concierge, deine Nutzung und deine privaten Kontodaten zu öffnen.",
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
                            Button(
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
                        modifier = Modifier.fillMaxWidth().heightIn(min = NahwerkSizes.PrimaryTouch).testTag("customer_login")
                    ) {
                        if (busy) CircularProgressIndicator(strokeWidth = 2.dp) else Text("Anmelden")
                    }
                }

                if (!error.isNullOrBlank()) {
                    Text(customerLoginError(error), color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
                }
            }
        }

        TextButton(
            onClick = onRegister,
            enabled = !busy,
            modifier = Modifier.fillMaxWidth().testTag("login_register")
        ) { Text("Noch kein Konto? Kostenlos registrieren", color = NahwerkPalette.Gold) }
    }
}

private fun customerLoginError(raw: String?): String {
    val text = raw.orEmpty()
    return when {
        text.contains("Passwort", ignoreCase = true) -> text
        text.contains("Code", ignoreCase = true) -> text
        text.contains("Sicherheits", ignoreCase = true) -> text
        else -> "Die Anmeldung konnte nicht abgeschlossen werden. Bitte prüfe deine Angaben und versuche es erneut."
    }
}
