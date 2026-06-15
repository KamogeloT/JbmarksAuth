package com.example.jbmarks.auth.ui

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.net.Uri
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Full-screen WebView that loads the Bitrix24 OAuth login page with a mobile user agent.
 * Intercepts the redirect URL to extract the authorization code without needing the
 * intermediate server to redirect to a deep link.
 *
 * @param authUrl          The full Bitrix24 authorization URL to load.
 * @param redirectUriPrefix The HTTPS redirect URI prefix to intercept (e.g. "https://jbmarks-oauth-redirect-prod.azurewebsites.net/oauth_redirect")
 * @param onCodeReceived   Called with the authorization code, domain, and member_id when intercepted.
 * @param onError          Called if an error occurs (e.g. user denied, page error).
 * @param onDismiss        Called when the user presses back to cancel login.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebViewLoginScreen(
    authUrl: String,
    redirectUriPrefix: String,
    onCodeReceived: (code: String, domain: String?, memberId: String?) -> Unit,
    onError: (String) -> Unit,
    onDismiss: () -> Unit
) {
    var isLoading by remember { mutableStateOf(true) }
    var progress by remember { mutableIntStateOf(0) }
    var webView by remember { mutableStateOf<WebView?>(null) }

    // Handle back button — go back in WebView history or dismiss
    BackHandler {
        val wv = webView
        if (wv != null && wv.canGoBack()) {
            wv.goBack()
        } else {
            onDismiss()
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Progress bar at the top
        if (isLoading) {
            LinearProgressIndicator(
                progress = { progress / 100f },
                modifier = Modifier.fillMaxWidth()
            )
        }

        // WebView
        AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )

                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.loadWithOverviewMode = true
                    settings.useWideViewPort = false
                    // Force mobile user agent
                    settings.userAgentString = "Mozilla/5.0 (Linux; Android 14; Pixel 8) " +
                        "AppleWebKit/537.36 (KHTML, like Gecko) " +
                        "Chrome/120.0.0.0 Mobile Safari/537.36"

                    webChromeClient = object : WebChromeClient() {
                        override fun onProgressChanged(view: WebView?, newProgress: Int) {
                            progress = newProgress
                            isLoading = newProgress < 100
                        }
                    }

                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            val url = request?.url?.toString() ?: return false
                            return handleUrl(url)
                        }

                        @Deprecated("For older API levels")
                        override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                            return url?.let { handleUrl(it) } ?: false
                        }

                        private fun handleUrl(url: String): Boolean {
                            // Intercept the deep link scheme
                            if (url.startsWith("jbmarks://oauth_redirect")) {
                                extractCodeAndNotify(url)
                                return true
                            }

                            // Intercept the HTTPS redirect URI (before it loads the intermediate page)
                            if (url.startsWith(redirectUriPrefix)) {
                                extractCodeAndNotify(url)
                                return true
                            }

                            return false
                        }

                        private fun extractCodeAndNotify(url: String) {
                            val uri = Uri.parse(url)
                            val code = uri.getQueryParameter("code")
                            val error = uri.getQueryParameter("error")
                            val domain = uri.getQueryParameter("domain")
                            val memberId = uri.getQueryParameter("member_id")

                            if (code != null) {
                                onCodeReceived(code, domain, memberId)
                            } else if (error != null) {
                                val desc = uri.getQueryParameter("error_description") ?: error
                                onError(desc)
                            } else {
                                onError("No authorization code received")
                            }
                        }

                        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                            isLoading = true
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            isLoading = false
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            errorCode: Int,
                            description: String?,
                            failingUrl: String?
                        ) {
                            if (errorCode != -1) { // -1 is ERROR_UNKNOWN which fires spuriously
                                onError(description ?: "Failed to load page")
                            }
                        }
                    }

                    webView = this
                    loadUrl(authUrl)
                }
            }
        )
    }
}
