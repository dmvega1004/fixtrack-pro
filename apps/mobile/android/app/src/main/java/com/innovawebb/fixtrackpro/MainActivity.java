package com.innovawebb.fixtrackpro;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // PrintPlugin y FileSharePlugin son plugins locales (no vienen de un
        // paquete npm), asi que Capacitor no los descubre solo: hay que
        // registrarlos antes de super.onCreate(), que es donde se arma el
        // bridge.
        registerPlugin(PrintPlugin.class);
        registerPlugin(FileSharePlugin.class);

        super.onCreate(savedInstanceState);

        // Manejador de errores propio (1.1.1): reintenta la primera
        // navegación sin señal y no manda los 4xx/5xx a «sin conexión».
        // Ver FixTrackWebViewClient. Se instala antes de que la vista web
        // entregue el primer aviso de la carga que pidió super.onCreate.
        // Fondo #FAFAFA (el de la app) para que la espera de los reintentos,
        // con la vista web oculta, no se vea negra ni parpadee en blanco.
        if (bridge != null) {
            bridge.setWebViewClient(new FixTrackWebViewClient(bridge));
            bridge.getWebView().setBackgroundColor(0xFFFAFAFA);
        }

        // El boton fisico de "atras" debe navegar dentro del historial de
        // la web cargada, no cerrar la app. Solo se deja cerrar cuando ya
        // no hay a donde volver.
        getOnBackPressedDispatcher()
            .addCallback(
                this,
                new OnBackPressedCallback(true) {
                    @Override
                    public void handleOnBackPressed() {
                        if (bridge != null && bridge.getWebView().canGoBack()) {
                            bridge.getWebView().goBack();
                        } else {
                            setEnabled(false);
                            getOnBackPressedDispatcher().onBackPressed();
                            setEnabled(true);
                        }
                    }
                }
            );
    }
}
