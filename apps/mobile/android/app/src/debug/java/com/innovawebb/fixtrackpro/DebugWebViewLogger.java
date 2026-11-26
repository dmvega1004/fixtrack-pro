package com.innovawebb.fixtrackpro;

import android.graphics.Bitmap;
import android.net.Uri;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;

/**
 * SOLO variante debug. Registra en logcat (etiqueta FixTrackDebug) lo que
 * hace falta para la ronda 1: qué carga la vista web, qué errores informa
 * y si Capacitor salta a su errorPath (https://localhost/offline.html)
 * encima de lo que sirvió el service worker.
 *
 * QUÉ NO SE REGISTRA, a propósito: cookies, cabeceras, cuerpos y cadenas
 * de consulta (las URL se escriben solo como origen + ruta). Nada de esto
 * identifica al técnico ni a sus clientes.
 *
 * NO cambia el comportamiento: hereda de FixTrackWebViewClient (el manejador
 * real de la app, que a su vez hereda del de Capacitor) y llama a super en
 * cada método; el cliente del service worker delega igual que el de
 * Capacitor (Bridge.loadWebView) en getLocalServer(). Las decisiones del
 * manejador (reintentos, contador) salen con la etiqueta
 * Capacitor/FixTrackWebViewClient.
 */
final class DebugWebViewLogger {

    private static final String TAG = DebugApp.TAG;

    private DebugWebViewLogger() {}

    static void install(Bridge bridge, boolean restored) {
        Log.i(TAG, "instalando registrador; actividad " + (restored ? "restaurada" : "nueva") + "; errorPath=" + safe(bridge.getErrorUrl()));
        bridge.setWebViewClient(new LoggingClient(bridge));

        ServiceWorkerController.getInstance()
            .setServiceWorkerClient(
                new ServiceWorkerClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                        WebResourceResponse response = bridge.getLocalServer().shouldInterceptRequest(request);
                        Log.d(
                            TAG,
                            "sw-petición " + request.getMethod() + " " + safe(request.getUrl()) + " → " + (response == null ? "red" : "servida por Capacitor")
                        );
                        return response;
                    }
                }
            );
    }

    /** Origen + ruta, sin consulta ni fragmento. */
    static String safe(Uri uri) {
        if (uri == null) return "null";
        return uri.getScheme() + "://" + uri.getAuthority() + uri.getPath();
    }

    static String safe(String url) {
        return url == null ? "null" : safe(Uri.parse(url));
    }

    private static final class LoggingClient extends FixTrackWebViewClient {

        LoggingClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            Log.i(TAG, "página-inicio " + safe(url));
            super.onPageStarted(view, url, favicon);
        }

        @Override
        public void onPageCommitVisible(WebView view, String url) {
            Log.i(TAG, "página-visible " + safe(url));
            super.onPageCommitVisible(view, url);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            Log.i(TAG, "página-fin " + safe(url) + " progreso=" + view.getProgress() + " vista=" + (view.getVisibility() == android.view.View.VISIBLE ? "visible" : "OCULTA"));
            super.onPageFinished(view, url);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            Log.w(
                TAG,
                "ERROR " + (request.isForMainFrame() ? "PRINCIPAL" : "secundario") + " " + safe(request.getUrl()) + " código=" + error.getErrorCode() + " «" + error.getDescription() + "»" + (request.isForMainFrame() ? (isConnectivityError(error.getErrorCode()) ? " (conectividad)" : " (no es de conectividad)") : "")
            );
            super.onReceivedError(view, request, error);
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
            Log.w(
                TAG,
                "HTTP " + response.getStatusCode() + " " + (request.isForMainFrame() ? "PRINCIPAL" : "secundario") + " " + safe(request.getUrl())
            );
            super.onReceivedHttpError(view, request, response);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            boolean handled = super.shouldOverrideUrlLoading(view, request);
            Log.i(TAG, "navegar " + safe(request.getUrl()) + (request.isRedirect() ? " (redirección)" : "") + (request.hasGesture() ? " (gesto)" : "") + (handled ? " → fuera de la app" : ""));
            return handled;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            WebResourceResponse response = super.shouldInterceptRequest(view, request);
            if (request.isForMainFrame()) {
                Log.d(TAG, "petición-principal " + request.getMethod() + " " + safe(request.getUrl()) + " → " + (response == null ? "red/service worker" : "servida por Capacitor"));
            }
            return response;
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            Log.e(TAG, "PROCESO DE RENDER MURIÓ; choque=" + detail.didCrash());
            return super.onRenderProcessGone(view, detail);
        }
    }
}
