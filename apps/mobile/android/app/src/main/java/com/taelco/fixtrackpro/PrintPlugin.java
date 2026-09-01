package com.taelco.fixtrackpro;

import android.app.Activity;
import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Puente al servicio de impresion de Android.
 *
 * La vista web de Capacitor (WebView) no implementa window.print(): la
 * llamada no hace nada, sin abrir dialogo ni lanzar error. La forma
 * soportada por el sistema de imprimir el contenido de un WebView es
 * WebView.createPrintDocumentAdapter(), que entrega el mismo dialogo
 * nativo de impresion/guardar PDF que usa cualquier otra app Android,
 * renderizando la pagina actual (incluidas las reglas @media print).
 */
@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        String title = call.getString("title", "documento");
        Activity activity = getActivity();
        WebView webView = getBridge().getWebView();

        // Las operaciones de impresion sobre el WebView requieren el hilo
        // principal; los metodos de plugin de Capacitor corren en un hilo
        // aparte por defecto.
        activity.runOnUiThread(() -> {
            PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
            if (printManager == null) {
                call.reject("El servicio de impresion no esta disponible en este dispositivo");
                return;
            }

            PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter(title);
            printManager.print(title, adapter, new PrintAttributes.Builder().build());
            call.resolve();
        });
    }
}
