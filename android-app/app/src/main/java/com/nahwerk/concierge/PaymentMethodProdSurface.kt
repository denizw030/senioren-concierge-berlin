package com.nahwerk.concierge

import android.annotation.SuppressLint
import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.unit.dp
import com.nahwerk.concierge.data.PaygCheckoutApi
import com.nahwerk.concierge.data.PaygSnapshot
import com.nahwerk.concierge.data.PaymentMethodCheckout
import com.nahwerk.concierge.data.PaymentReadinessApi
import com.nahwerk.concierge.data.PaymentReadinessSnapshot
import com.nahwerk.concierge.data.ProdCustomerApi
import kotlinx.coroutines.launch

/**
 * Real PROD payment-method surface. Stripe owns all card entry in its hosted
 * Checkout page. NAHWERK only creates the server-bound setup session and syncs
 * its confirmed result; full card data never enters Compose state or app storage.
 *
 * Checkout stays fail-closed until the independent PROD readiness endpoint
 * confirms Stripe live mode, webhook secret, endpoint and required events.
 */
@Composable
internal fun PaymentMethodProdSurface() {
    val context = LocalContext.current
    val productApi = remember { ProdCustomerApi(context) }
    val readinessApi = remember { PaymentReadinessApi() }
    val checkoutApi = remember { PaygCheckoutApi(context) }
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf<PaygSnapshot?>(null) }
    var readiness by remember { mutableStateOf<PaymentReadinessSnapshot?>(null) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var checkout by remember { mutableStateOf<PaymentMethodCheckout?>(null) }

    fun reload() {
        loading = true
        error = null
        scope.launch {
            val paygResult = productApi.loadPayg()
            val readinessResult = readinessApi.load()
            paygResult
                .onSuccess { state = it }
                .onFailure { error = it.message ?: "Zahlungsmethoden konnten nicht geladen werden." }
            readinessResult
                .onSuccess { readiness = it }
                .onFailure {
                    readiness = null
                    if (error == null) error = it.message ?: "Zahlungsbereitschaft konnte nicht bestätigt werden."
                }
            loading = false
        }
    }

    LaunchedEffect(Unit) { if (productApi.hasSession()) reload() }

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
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("ZAHLUNGSMETHODE", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                    Text("Sicher über Stripe", style = MaterialTheme.typography.titleLarge)
                }
                if (loading) CircularProgressIndicator(modifier = Modifier.height(24.dp), strokeWidth = 2.dp, color = NahwerkPalette.Gold)
            }

            val active = state?.paymentMethods?.firstOrNull { it.isDefault && it.status == "ACTIVE" }
                ?: state?.paymentMethods?.firstOrNull { it.status == "ACTIVE" }
            when {
                active != null -> {
                    val label = buildString {
                        append(active.brand?.uppercase() ?: active.methodType)
                        active.last4?.let { append(" · endet auf $it") }
                        if (active.expMonth != null && active.expYear != null) append(" · ${active.expMonth.toString().padStart(2, '0')}/${active.expYear}")
                    }
                    Text("Hinterlegt", color = NahwerkPalette.Success, style = MaterialTheme.typography.titleMedium)
                    Text(label, color = NahwerkPalette.SecondaryText)
                }
                state != null -> Text("Noch keine bestätigte Zahlungsmethode.", color = NahwerkPalette.SecondaryText)
            }

            if (!error.isNullOrBlank()) {
                Text(requireNotNull(error), color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
            }

            val ready = state?.enabled == true &&
                state?.billingBlocked != true &&
                state?.setupAvailable == true &&
                readiness?.paymentReady == true
            Button(
                onClick = {
                    loading = true
                    error = null
                    scope.launch {
                        readinessApi.load()
                            .onFailure {
                                readiness = null
                                error = it.message ?: "Stripe Live konnte nicht bestätigt werden."
                            }
                            .onSuccess { fresh ->
                                readiness = fresh
                                if (!fresh.paymentReady) {
                                    error = "Stripe Live ist noch nicht vollständig zahlungsbereit."
                                } else {
                                    checkoutApi.createPaymentMethodCheckout()
                                        .onSuccess { checkout = it }
                                        .onFailure { error = it.message ?: "Stripe konnte nicht vorbereitet werden." }
                                }
                            }
                        loading = false
                    }
                },
                enabled = ready && !loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (active == null) "Zahlungsmethode hinterlegen" else "Zahlungsmethode ändern")
            }

            if (state != null && !ready) {
                Text(
                    when {
                        state?.billingBlocked == true -> "PAYG ist serverseitig gesperrt."
                        state?.enabled != true -> "Aktiviere zuerst PAYG."
                        state?.setupAvailable != true -> "Stripe-Setup ist serverseitig noch nicht verfügbar."
                        readiness == null -> "Stripe Live konnte noch nicht eindeutig bestätigt werden."
                        readiness?.liveConfirmed != true -> "Stripe läuft noch nicht bestätigt im Live-Modus."
                        readiness?.webhookSecretConfigured != true ||
                            readiness?.webhookEndpointConfigured != true ||
                            readiness?.webhookEndpointEnabled != true ||
                            readiness?.webhookRequiredEventsComplete != true -> "Stripe Live ist noch nicht vollständig für Zahlungen konfiguriert."
                        readiness?.paymentReady != true -> "Zahlungen sind serverseitig noch nicht freigegeben."
                        else -> "Zahlungsmethode ist derzeit nicht verfügbar."
                    },
                    color = NahwerkPalette.Warning,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            if (readiness?.paymentReady == true) {
                Text("Stripe Live · zahlungsbereit bestätigt", color = NahwerkPalette.Success, style = MaterialTheme.typography.bodySmall)
            }
            Text(
                "Kartendaten werden ausschließlich auf der von Stripe gehosteten Seite eingegeben. NAHWERK speichert keine vollständigen Kartendaten.",
                color = NahwerkPalette.SecondaryText,
                style = MaterialTheme.typography.labelSmall
            )
            OutlinedButton(onClick = { reload() }, enabled = !loading, modifier = Modifier.fillMaxWidth()) {
                Text("Status aktualisieren")
            }
        }
    }

    checkout?.let { current ->
        StripeCheckoutDialog(
            checkout = current,
            onCancelled = { checkout = null },
            onConfirmed = {
                checkout = null
                loading = true
                error = null
                scope.launch {
                    checkoutApi.syncPaymentMethod(current.checkoutSessionId)
                        .onSuccess { reload() }
                        .onFailure { error = it.message ?: "Zahlungsmethode konnte noch nicht bestätigt werden."; loading = false }
                }
            }
        )
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun StripeCheckoutDialog(
    checkout: PaymentMethodCheckout,
    onCancelled: () -> Unit,
    onConfirmed: () -> Unit
) {
    Dialog(
        onDismissRequest = onCancelled,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Card(
            modifier = Modifier.fillMaxSize().padding(12.dp),
            shape = RoundedCornerShape(NahwerkRadii.Large),
            colors = CardDefaults.cardColors(containerColor = NahwerkPalette.Surface),
            border = BorderStroke(1.dp, NahwerkPalette.Divider)
        ) {
            Column(Modifier.fillMaxSize()) {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = NahwerkSpacing.Md, vertical = NahwerkSpacing.Sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(Modifier.weight(1f)) {
                        Text("Sichere Stripe-Seite", style = MaterialTheme.typography.titleMedium)
                        Text("Keine Kartendaten in NAHWERK", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelSmall)
                    }
                    TextButton(onClick = onCancelled) { Text("Schließen") }
                }
                Box(Modifier.fillMaxSize()) {
                    AndroidView(
                        modifier = Modifier.fillMaxSize(),
                        factory = { ctx ->
                            WebView(ctx).apply {
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                settings.allowFileAccess = false
                                settings.allowContentAccess = false
                                settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                                webViewClient = object : WebViewClient() {
                                    override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                                        val uri = request?.url ?: return false
                                        return handleReturn(uri, onCancelled, onConfirmed)
                                    }

                                    @Deprecated("Deprecated in Java")
                                    override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                                        val uri = url?.let(Uri::parse) ?: return false
                                        return handleReturn(uri, onCancelled, onConfirmed)
                                    }
                                }
                                loadUrl(checkout.checkoutUrl)
                            }
                        }
                    )
                }
            }
        )
    }
}

private fun handleReturn(uri: Uri, onCancelled: () -> Unit, onConfirmed: () -> Unit): Boolean {
    val trustedHost = uri.host.equals("nahwerkconcierge.com", ignoreCase = true) ||
        uri.host.equals("www.nahwerkconcierge.com", ignoreCase = true)
    if (!trustedHost || uri.path != "/payg.html") return false
    return when (uri.getQueryParameter("payment_setup")) {
        "success" -> { onConfirmed(); true }
        "cancelled" -> { onCancelled(); true }
        else -> false
    }
}
