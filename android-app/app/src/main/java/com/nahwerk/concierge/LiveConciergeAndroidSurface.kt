package com.nahwerk.concierge

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import org.json.JSONObject

private const val LIVE_URL = "https://nahwerkconcierge.com/app-live.html"
private const val LIVE_HOST = "nahwerkconcierge.com"

@Composable
internal fun LiveConciergeAndroidSurface(
    sessionToken: String,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    var permissionGranted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    var permissionResolved by remember { mutableStateOf(permissionGranted) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        permissionGranted = granted
        permissionResolved = true
    }

    BackHandler(onBack = onClose)

    LaunchedEffect(Unit) {
        if (!permissionGranted) launcher.launch(Manifest.permission.RECORD_AUDIO)
    }

    if (!permissionGranted) {
        Box(
            Modifier.fillMaxSize().background(NahwerkPalette.Background),
            contentAlignment = Alignment.Center
        ) {
            Column(
                Modifier.padding(NahwerkSpacing.Xxl),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(NahwerkSpacing.Lg)
            ) {
                Text(
                    if (permissionResolved)
                        "Für Live-Gespräche braucht NAHWERK Zugriff auf dein Mikrofon."
                    else
                        "Mikrofon wird vorbereitet …",
                    color = NahwerkPalette.PrimaryText
                )
                if (permissionResolved) Button(onClick = onClose) { Text("Zurück") }
            }
        }
        return
    }

    val encodedToken = remember(sessionToken) { JSONObject.quote(sessionToken) }
    val webView = remember {
        WebView(context).apply {
            setBackgroundColor(android.graphics.Color.BLACK)
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            settings.mediaPlaybackRequiresUserGesture = false
            webChromeClient = object : WebChromeClient() {
                override fun onPermissionRequest(request: PermissionRequest) {
                    val origin: Uri = request.origin
                    val audioRequested = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                    val onlyAudio = request.resources.all { it == PermissionRequest.RESOURCE_AUDIO_CAPTURE }
                    val trusted = origin.scheme == "https" && origin.host == LIVE_HOST
                    if (trusted && audioRequested && onlyAudio &&
                        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                        PackageManager.PERMISSION_GRANTED
                    ) {
                        request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                    } else {
                        request.deny()
                    }
                }
            }
            addJavascriptInterface(object {
                @JavascriptInterface
                fun close() {
                    post { onClose() }
                }
            }, "NAHWERKAndroidLive")
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    val parsed = runCatching { Uri.parse(url) }.getOrNull()
                    if (parsed?.scheme == "https" && parsed.host == LIVE_HOST && parsed.path == "/app-live.html") {
                        view.evaluateJavascript("window.startNahwerkAppLive($encodedToken)", null)
                    }
                }

                override fun shouldOverrideUrlLoading(view: WebView, request: android.webkit.WebResourceRequest): Boolean {
                    val url = request.url
                    return !(url.scheme == "https" && url.host == LIVE_HOST)
                }
            }
            loadUrl(LIVE_URL)
        }
    }

    DisposableEffect(webView) {
        onDispose {
            runCatching { webView.evaluateJavascript("window.stopNahwerkAppLive?.()", null) }
            webView.stopLoading()
            webView.removeJavascriptInterface("NAHWERKAndroidLive")
            webView.destroy()
        }
    }

    AndroidView(
        factory = { webView },
        modifier = Modifier.fillMaxSize()
    )
}
