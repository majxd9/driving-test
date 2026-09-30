package com.rukhsati.app

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.ConnectivityManager
import android.net.Network
import android.net.Uri
import android.net.http.SslError
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.SslErrorHandler
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebChromeClient.FileChooserParams
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import java.util.Locale

/**
 * رخصتي — the app's only screen.
 *
 * It shows the live website inside a WebView and adds what a browser tab cannot do:
 *  - FLAG_SECURE: Android blocks screenshots, screen recording and casting of this window.
 *  - A loading screen, an offline screen with automatic retry, and crash-proof recovery.
 *  - Back button that works inside the site, external links opened in the right app.
 *
 * The website itself is never modified: change SITE_URL in app/build.gradle.kts to point elsewhere.
 */
class MainActivity : ComponentActivity() {

    private lateinit var root: View
    private lateinit var webView: WebView
    private lateinit var loadingView: View
    private lateinit var errorView: View

    private var currentUrl: String? = null
    private var failedUrl: String? = null
    private var mainFrameFailed = false
    private var rendererGone = false
    private var lastBackPressAt = 0L
    private var pendingFileCallback: ValueCallback<Array<Uri>>? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null

    /** Hosts that stay inside the app (from INTERNAL_HOSTS in build.gradle.kts). */
    private val internalHosts: List<String> by lazy {
        BuildConfig.INTERNAL_HOSTS.split(',')
            .map { it.trim().lowercase(Locale.ROOT) }
            .filter { it.isNotEmpty() }
    }

    /** Lets <input type="file"> work inside the WebView (e.g. uploads in the admin dashboard). */
    private val fileChooser = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        pendingFileCallback?.onReceiveValue(
            FileChooserParams.parseResult(result.resultCode, result.data),
        )
        pendingFileCallback = null
    }

    // ---------------------------------------------------------------- lifecycle

    override fun onCreate(savedInstanceState: Bundle?) {
        // Draw behind the system bars. The app is dark, so the bar icons must be light.
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(Color.TRANSPARENT),
        )
        super.onCreate(savedInstanceState)

        // FLAG_SECURE: the whole window is treated as secure content by Android.
        if (BuildConfig.BLOCK_SCREENSHOTS) {
            window.setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE,
            )
        }

        try {
            setContentView(R.layout.activity_main)
        } catch (ignored: RuntimeException) {
            // "Android System WebView" is missing or disabled on this phone.
            Toast.makeText(this, R.string.webview_missing, Toast.LENGTH_LONG).show()
            finish()
            return
        }

        root = findViewById(R.id.root)
        webView = findViewById(R.id.webView)
        loadingView = findViewById(R.id.loadingView)
        errorView = findViewById(R.id.errorView)
        findViewById<Button>(R.id.retryButton).setOnClickListener { retry() }

        applyWindowInsets()
        configureWebView()
        handleBackNavigation()

        // After Android killed the app in the background, come back to the same page.
        val restored = savedInstanceState?.let { webView.restoreState(it) } != null
        if (!restored) webView.loadUrl(BuildConfig.SITE_URL)
    }

    override fun onStart() {
        super.onStart()
        registerNetworkCallback()
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) webView.onResume()
    }

    override fun onPause() {
        if (::webView.isInitialized) {
            CookieManager.getInstance().flush() // keep the login cookie safe on disk
            webView.onPause()
        }
        super.onPause()
    }

    override fun onStop() {
        unregisterNetworkCallback()
        super.onStop()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        if (::webView.isInitialized && !rendererGone) webView.saveState(outState)
    }

    override fun onDestroy() {
        pendingFileCallback?.onReceiveValue(null)
        pendingFileCallback = null
        if (::webView.isInitialized) {
            (webView.parent as? ViewGroup)?.removeView(webView)
            webView.destroy()
        }
        super.onDestroy()
    }

    // ---------------------------------------------------------------- setup

    /** Keeps the page clear of the status bar, the navigation bar, the notch and the keyboard. */
    private fun applyWindowInsets() {
        ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or
                    WindowInsetsCompat.Type.displayCutout() or
                    WindowInsetsCompat.Type.ime(),
            )
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        // Chrome DevTools can inspect the page only in debug builds.
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        webView.setBackgroundColor(getColor(R.color.brand_bg))

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // localStorage: device id and preferences
            allowFileAccess = false
            allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            // Pinch-to-zoom like in the browser (useful for sign images), without the +/- buttons.
            builtInZoomControls = true
            displayZoomControls = false
            // Lets the website recognise the app if it ever needs to ("RukhsatiApp/1.0.0").
            userAgentString = "$userAgentString RukhsatiApp/${BuildConfig.VERSION_NAME}"
        }

        // The login cookie comes from the API on another domain (SameSite=None), so the
        // WebView must accept third-party cookies or students would be logged out at once.
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.webViewClient = AppWebViewClient()
        webView.webChromeClient = AppChromeClient()
        webView.setDownloadListener { url, _, _, _, _ -> openExternally(Uri.parse(url)) }
    }

    /** Back goes back inside the site; on the first page a second press within 2s exits. */
    private fun handleBackNavigation() {
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        exitOnDoubleBack()
                    }
                }
            },
        )
    }

    private fun exitOnDoubleBack() {
        val now = SystemClock.elapsedRealtime()
        if (now - lastBackPressAt < EXIT_WINDOW_MS) {
            finish()
        } else {
            lastBackPressAt = now
            Toast.makeText(this, R.string.press_back_again, Toast.LENGTH_SHORT).show()
        }
    }

    // ---------------------------------------------------------------- screens

    private fun showLoading() {
        loadingView.animate().cancel()
        loadingView.alpha = 1f
        loadingView.visibility = View.VISIBLE
        errorView.visibility = View.GONE
    }

    private fun showContent() {
        errorView.visibility = View.GONE
        if (loadingView.visibility == View.VISIBLE) {
            loadingView.animate()
                .alpha(0f)
                .setDuration(220)
                .withEndAction { loadingView.visibility = View.GONE }
                .start()
        }
    }

    private fun showError() {
        loadingView.animate().cancel()
        loadingView.visibility = View.GONE
        errorView.visibility = View.VISIBLE
    }

    private fun failMainFrame(url: String?) {
        mainFrameFailed = true
        failedUrl = url
        showError()
    }

    private fun retry() {
        mainFrameFailed = false
        showLoading()
        webView.loadUrl(failedUrl ?: BuildConfig.SITE_URL)
        failedUrl = null
    }

    // ---------------------------------------------------------------- automatic retry

    /** When the internet comes back while the error screen is showing, reload by itself. */
    private fun registerNetworkCallback() {
        if (!::errorView.isInitialized || networkCallback != null) return
        val manager = getSystemService(ConnectivityManager::class.java) ?: return
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                runOnUiThread {
                    if (errorView.visibility == View.VISIBLE) retry()
                }
            }
        }
        try {
            manager.registerDefaultNetworkCallback(callback)
            networkCallback = callback
        } catch (ignored: RuntimeException) {
            // Automatic retry is a nicety; the retry button still works.
        }
    }

    private fun unregisterNetworkCallback() {
        val callback = networkCallback ?: return
        networkCallback = null
        try {
            getSystemService(ConnectivityManager::class.java)?.unregisterNetworkCallback(callback)
        } catch (ignored: RuntimeException) {
            // Already unregistered.
        }
    }

    // ---------------------------------------------------------------- links

    private fun isInternalHost(host: String?): Boolean {
        val h = host?.lowercase(Locale.ROOT) ?: return false
        return internalHosts.any { h == it || h.endsWith(".$it") }
    }

    /**
     * Decides where a link goes. Returns true when the app handled it (the WebView must not load it).
     *  - the site's own pages stay in the app;
     *  - other websites and tel:/mailto:/WhatsApp… open in the matching app;
     *  - anything unknown (file:, content:, intent:, javascript:…) is ignored for safety.
     */
    private fun handleNavigation(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase(Locale.ROOT)
        return when {
            scheme == "http" || scheme == "https" -> {
                if (isInternalHost(uri.host)) {
                    false
                } else {
                    openExternally(uri)
                    true
                }
            }
            scheme == "about" || scheme == "blob" || scheme == "data" -> false
            scheme in EXTERNAL_SCHEMES -> {
                openExternally(uri)
                true
            }
            else -> true
        }
    }

    private fun openExternally(uri: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        } catch (ignored: ActivityNotFoundException) {
            Toast.makeText(this, R.string.external_link_failed, Toast.LENGTH_SHORT).show()
        }
    }

    // ---------------------------------------------------------------- WebView clients

    private inner class AppWebViewClient : WebViewClient() {

        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
            val uri = request?.url ?: return false
            return handleNavigation(uri)
        }

        override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
            currentUrl = url
            mainFrameFailed = false
        }

        override fun onPageFinished(view: WebView?, url: String?) {
            CookieManager.getInstance().flush()
            // If the load failed, WebView still reports "finished" for its own error page:
            // keep our error screen on top in that case.
            if (!mainFrameFailed) showContent()
        }

        override fun onReceivedError(
            view: WebView?,
            request: WebResourceRequest?,
            error: WebResourceError?,
        ) {
            if (request != null && request.isForMainFrame) {
                failMainFrame(request.url.toString())
            }
        }

        override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
            // Never continue on a certificate problem (a wrong phone date is the usual cause).
            handler?.cancel()
            val errorHost = error?.url?.let { Uri.parse(it).host }
            val pageHost = currentUrl?.let { Uri.parse(it).host }
            if (errorHost != null && errorHost == pageHost) failMainFrame(currentUrl)
        }

        override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
            // The WebView process died (usually low memory). Rebuild the screen instead of
            // crashing the app; if it dies again right away, close quietly.
            val now = SystemClock.elapsedRealtime()
            val crashedAgainQuickly = now - lastRendererCrashAt < RENDERER_CRASH_WINDOW_MS
            lastRendererCrashAt = now
            rendererGone = true
            if (crashedAgainQuickly) finish() else recreate()
            return true
        }
    }

    private inner class AppChromeClient : WebChromeClient() {

        override fun onShowFileChooser(
            webView: WebView?,
            filePathCallback: ValueCallback<Array<Uri>>?,
            fileChooserParams: FileChooserParams?,
        ): Boolean {
            if (filePathCallback == null || fileChooserParams == null) return false
            pendingFileCallback?.onReceiveValue(null) // cancel an older, unanswered request
            pendingFileCallback = filePathCallback
            return try {
                fileChooser.launch(fileChooserParams.createIntent())
                true
            } catch (ignored: ActivityNotFoundException) {
                pendingFileCallback?.onReceiveValue(null)
                pendingFileCallback = null
                false
            }
        }
    }

    private companion object {
        const val EXIT_WINDOW_MS = 2_000L
        const val RENDERER_CRASH_WINDOW_MS = 10_000L
        val EXTERNAL_SCHEMES = setOf("tel", "mailto", "sms", "smsto", "whatsapp", "tg", "geo")

        /** Survives activity recreation (same process) so a crash loop can be detected. */
        var lastRendererCrashAt = 0L
    }
}
