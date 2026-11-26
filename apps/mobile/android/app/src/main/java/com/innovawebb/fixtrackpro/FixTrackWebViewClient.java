package com.innovawebb.fixtrackpro;

import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.Logger;

/**
 * Manejador de errores de la vista web (APK 1.1.1). Hereda del de Capacitor
 * y cambia SOLO dos cosas:
 *
 * 1. Error de CONECTIVIDAD en la navegación principal hacia fixtrackpro.com:
 *    antes de mostrar la página sin conexión (errorPath), reintenta la misma
 *    URL hasta 2 veces (a 1 s y a 2.5 s). Ronda 1 de diagnóstico
 *    (2026-11-25, Android 16, WebView 157): en un arranque en frío sin señal
 *    la PRIMERA navegación del proceso falla con ERR_NAME_NOT_RESOLVED antes
 *    de que el service worker alcance a responder, y un segundo intento
 *    1.4 s después lo sirve de la caché sin problema. Mientras espera, la
 *    vista web queda oculta: se ve el fondo de la ventana (#FAFAFA), no la
 *    página de error de Android.
 *
 * 2. Errores HTTP (4xx/5xx) de navegación: Capacitor saltaba a errorPath
 *    («sin conexión») ante CUALQUIERA, p. ej. el 404 de una orden borrada.
 *    Ahora se deja ver la respuesta de la propia web.
 *
 * Todo lo demás (errores de recursos secundarios, SSL, navegaciones
 * canceladas, otros esquemas o dominios, métodos distintos de GET) sigue
 * exactamente como en Capacitor: super.onReceivedError → errorPath.
 *
 * CONTADOR: vuelve a 0 SOLO cuando termina una página principal de
 * fixtrackpro.com sin error registrado para esa misma navegación (y al
 * 100 %): onPageFinished también se dispara para la página de error
 * (con la URL que falló y progreso 10 %, ronda 1) y para errorPath. También
 * vuelve a 0 cuando la persona toca algo que navega (gesto real, p. ej.
 * «Reintentar» en errorPath): los reintentos automáticos nunca son gesto,
 * así que no hay bucle.
 *
 * ⚠️ DEPENDENCIA DE CAPACITOR (@capacitor/android 8.5): en los dos casos
 * de arriba NO se llama a super, así que tampoco se avisa a los
 * WebViewListener de onReceivedError / onReceivedHttpError (la lista es
 * privada del paquete de Capacitor). Hoy el único oyente es el de
 * SystemBars y solo usa onPageCommitVisible, que sí pasa por super. Al
 * actualizar Capacitor, revisar BridgeWebViewClient y quién llama a
 * addWebViewListener, siguiendo la lista de apps/mobile/README.md.
 */
public class FixTrackWebViewClient extends BridgeWebViewClient {

    private static final String TAG = "FixTrackWebViewClient";

    /** Espera antes de cada reintento automático. Dos reintentos en total. */
    private static final long[] RETRY_DELAYS_MS = { 1_000, 2_500 };

    /**
     * Si un reintento no llega a mostrar nada en este tiempo (p. ej. la
     * señal está volviendo y el service worker espera a la red sin tiempo
     * límite, caso E de la ronda 1), se deja de esperar y se muestra
     * errorPath: nunca una pantalla vacía indefinida.
     */
    private static final long RETRY_WATCHDOG_MS = 5_000;

    private final Bridge bridge;
    private final Handler handler = new Handler(Looper.getMainLooper());

    /** Reintentos automáticos ya usados desde la última carga buena o gesto. */
    private int retriesUsed = 0;
    /** Hubo error en la navegación principal EN CURSO (se limpia en onPageStarted). */
    private boolean mainFrameFailed = false;
    /** Sube con cada reintento/abandono: invalida esperas y vigilancias viejas. */
    private int generation = 0;

    public FixTrackWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
    }

    /**
     * Errores que se reintentan, y por qué: son los que significan «no se
     * llegó al servidor», que es lo que le pasa a la primera navegación de un
     * proceso recién creado sin señal.
     *  - ERROR_HOST_LOOKUP (-2): no se resolvió el nombre (ERR_NAME_NOT_RESOLVED;
     *    es el que dio la ronda 1 en los tres arranques en frío).
     *  - ERROR_CONNECT (-6): no se pudo conectar (conexión rechazada, dirección
     *    inalcanzable).
     *  - ERROR_TIMEOUT (-8): la conexión se agotó.
     *  - ERROR_IO (-7): la conexión se cortó al leer o escribir.
     * NO se reintentan: ERROR_UNKNOWN (incluye navegaciones canceladas /
     * ERR_ABORTED), los de SSL (ERROR_FAILED_SSL_HANDSHAKE y compañía), los de
     * autenticación, URL inválida, archivo, demasiadas redirecciones, etc.
     */
    static boolean isConnectivityError(int code) {
        switch (code) {
            case WebViewClient.ERROR_HOST_LOOKUP:
            case WebViewClient.ERROR_CONNECT:
            case WebViewClient.ERROR_TIMEOUT:
            case WebViewClient.ERROR_IO:
                return true;
            default:
                return false;
        }
    }

    /** ¿Es https://fixtrackpro.com/... (el mismo origen que carga Capacitor)? */
    private boolean isAppUrl(Uri url) {
        if (url == null) return false;
        Uri app = Uri.parse(bridge.getAppUrl());
        return "https".equals(url.getScheme()) && app.getHost() != null && app.getHost().equals(url.getHost());
    }

    private boolean isAppUrl(String url) {
        return url != null && isAppUrl(Uri.parse(url));
    }

    @Override
    public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
        mainFrameFailed = false;
        super.onPageStarted(view, url, favicon);
    }

    @Override
    public void onPageCommitVisible(WebView view, String url) {
        // Se muestra lo que sea que llegue a pintarse sin error: la app o
        // errorPath. La página de error de Android (navegación fallida) no.
        if (!mainFrameFailed) show(view);
        super.onPageCommitVisible(view, url);
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        super.onPageFinished(view, url);
        if (!mainFrameFailed && isAppUrl(url) && view.getProgress() == 100) {
            if (retriesUsed > 0) Logger.info(TAG, "carga buena de " + url + " — contador de reintentos a 0");
            retriesUsed = 0;
            generation++; // cancela una vigilancia pendiente
            show(view);
        }
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (request.isForMainFrame() && request.hasGesture() && isAppUrl(request.getUrl())) {
            if (retriesUsed > 0) Logger.info(TAG, "la persona navegó (gesto) — contador de reintentos a 0");
            retriesUsed = 0;
        }
        return super.shouldOverrideUrlLoading(view, request);
    }

    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (!request.isForMainFrame()) {
            super.onReceivedError(view, request, error);
            return;
        }
        mainFrameFailed = true;

        int code = error.getErrorCode();
        boolean retriable =
            "GET".equalsIgnoreCase(request.getMethod()) && isAppUrl(request.getUrl()) && isConnectivityError(code);

        if (retriable && retriesUsed < RETRY_DELAYS_MS.length) {
            long delay = RETRY_DELAYS_MS[retriesUsed];
            retriesUsed++;
            Logger.info(TAG, "error de conectividad " + code + " — reintento " + retriesUsed + " de " + RETRY_DELAYS_MS.length + " en " + delay + " ms");
            view.setVisibility(View.INVISIBLE);
            scheduleRetry(view, request.getUrl().toString(), delay);
            return;
        }

        Logger.info(
            TAG,
            (retriable ? "reintentos agotados" : "error " + code + " no se reintenta") + " — se muestra la página sin conexión"
        );
        generation++;
        // No se muestra todavía: lo hace onPageCommitVisible cuando errorPath
        // se pinte, así no asoma la página de error de Android en medio.
        if (bridge.getErrorUrl() == null) show(view);
        super.onReceivedError(view, request, error); // Capacitor: avisa y carga errorPath
    }

    @Override
    public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
        // Recursos secundarios: como Capacitor (que solo salta a errorPath en
        // la página principal). Página principal: SIN errorPath — un 404/500
        // lo explica la propia web, no «sin conexión».
        if (!request.isForMainFrame()) {
            super.onReceivedHttpError(view, request, errorResponse);
            return;
        }
        Logger.info(TAG, "HTTP " + errorResponse.getStatusCode() + " en la página principal — se deja ver la respuesta");
    }

    private void scheduleRetry(WebView view, String url, long delayMs) {
        final int token = ++generation;
        handler.postDelayed(
            () -> {
                if (token != generation) return;
                Logger.info(TAG, "reintentando " + url);
                view.loadUrl(url);
                handler.postDelayed(
                    () -> {
                        if (token != generation) return;
                        Logger.info(TAG, "el reintento no mostró nada en " + RETRY_WATCHDOG_MS + " ms — se muestra la página sin conexión");
                        retriesUsed = RETRY_DELAYS_MS.length;
                        generation++;
                        String errorUrl = bridge.getErrorUrl();
                        if (errorUrl != null) view.loadUrl(errorUrl); // se muestra al pintarse
                        else show(view);
                    },
                    RETRY_WATCHDOG_MS
                );
            },
            delayMs
        );
    }

    private static void show(WebView view) {
        if (view.getVisibility() != View.VISIBLE) view.setVisibility(View.VISIBLE);
    }
}
