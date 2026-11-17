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
