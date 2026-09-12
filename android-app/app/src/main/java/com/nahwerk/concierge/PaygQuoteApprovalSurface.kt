package com.nahwerk.concierge

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
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
import com.nahwerk.concierge.data.PaygQuote
import com.nahwerk.concierge.data.PaygQuoteActionApi
import com.nahwerk.concierge.data.PaygSnapshot
import com.nahwerk.concierge.data.ProdCustomerApi
import com.nahwerk.concierge.data.ProdCustomerPolicy
import kotlinx.coroutines.launch

/**
 * Explicit customer approval surface for already-priced PAYG actions.
 * The server owns amount, expiry, authorization and canonical execution state.
 */
@Composable
internal fun PaygQuoteApprovalSurface() {
    val context = LocalContext.current
    val productApi = remember { ProdCustomerApi(context) }
    val actionApi = remember { PaygQuoteActionApi(context) }
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf<PaygSnapshot?>(null) }
    var selected by remember { mutableStateOf<PaygQuote?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    fun reload() {
        if (!productApi.hasSession()) return
        busy = true
        error = null
        scope.launch {
            productApi.loadPayg()
                .onSuccess { state = it }
                .onFailure { error = it.message ?: "PAYG-Aufträge konnten nicht geladen werden." }
            busy = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    val approvable = state?.quotes.orEmpty().filter { it.status == "QUOTED" }
    if (state != null || busy || !error.isNullOrBlank()) {
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
                        Text("PAYG-AUFTRÄGE", color = NahwerkPalette.Gold, style = MaterialTheme.typography.labelSmall)
                        Text("Kosten prüfen & freigeben", style = MaterialTheme.typography.titleLarge)
                    }
                    if (busy) CircularProgressIndicator(color = NahwerkPalette.Gold)
                }

                if (!error.isNullOrBlank()) {
                    Text(requireNotNull(error), color = NahwerkPalette.Error, style = MaterialTheme.typography.bodySmall)
                }

                if (!busy && approvable.isEmpty()) {
                    Text(
                        "Kein kostenpflichtiger Auftrag wartet auf deine Freigabe.",
                        color = NahwerkPalette.SecondaryText,
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                approvable.forEach { quote ->
                    Column(verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                        Text(quote.description.ifBlank { "Kostenpflichtiger Concierge-Auftrag" }, style = MaterialTheme.typography.titleMedium)
                        Text(
                            ProdCustomerPolicy.euro(quote.amountCents, quote.currency),
                            color = NahwerkPalette.Gold,
                            style = MaterialTheme.typography.titleLarge
                        )
                        quote.expiresAt?.let {
                            Text("Freigabe gültig bis: $it", color = NahwerkPalette.SecondaryText, style = MaterialTheme.typography.labelSmall)
                        }
                        Button(
                            onClick = { selected = quote },
                            enabled = !busy,
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Kostenpflichtig freigeben") }
                        OutlinedButton(
                            onClick = {
                                busy = true
                                error = null
                                scope.launch {
                                    actionApi.cancel(quote.id)
                                        .onSuccess { reload() }
                                        .onFailure { error = it.message ?: "Auftrag konnte nicht storniert werden."; busy = false }
                                }
                            },
                            enabled = !busy,
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Nicht ausführen") }
                    }
                }

                TextButton(onClick = { reload() }, enabled = !busy) { Text("Auftragsstatus aktualisieren") }
                Text(
                    "Ohne deine ausdrückliche Freigabe wird ein QUOTED-PAYG-Auftrag nicht als genehmigt markiert. Preis und Status stammen ausschließlich aus PROD.",
                    color = NahwerkPalette.SecondaryText,
                    style = MaterialTheme.typography.labelSmall
                )
            }
        }
    }

    selected?.let { quote ->
        AlertDialog(
            onDismissRequest = { if (!busy) selected = null },
            title = { Text("Kosten verbindlich freigeben?") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Sm)) {
                    Text(quote.description.ifBlank { "Concierge-Auftrag" })
                    Text(ProdCustomerPolicy.euro(quote.amountCents, quote.currency), style = MaterialTheme.typography.headlineSmall)
                    Text("Mit „Freigeben“ bestätigst du genau diesen serverseitig berechneten PAYG-Preis.")
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        busy = true
                        error = null
                        scope.launch {
                            actionApi.approve(quote.id)
                                .onSuccess { selected = null; reload() }
                                .onFailure { error = it.message ?: "Auftrag konnte nicht freigegeben werden."; busy = false }
                        }
                    },
                    enabled = !busy
                ) { Text("Freigeben") }
            },
            dismissButton = {
                TextButton(onClick = { selected = null }, enabled = !busy) { Text("Abbrechen") }
            }
        )
    }
}
