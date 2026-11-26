package com.innovawebb.fixtrackpro;

import android.app.Activity;
import android.app.Application;
import android.os.Bundle;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.getcapacitor.Bridge;

/**
 * SOLO variante debug (src/debug). Engancha el registrador de la vista web
 * (DebugWebViewLogger) sin tocar MainActivity ni nada de src/main: la
 * release no lo trae porque esta clase ni siquiera se compila ahí.
 *
 * onActivityPostCreated corre DESPUÉS de MainActivity.onCreate, cuando el
 * puente de Capacitor ya existe y ya pidió cargar fixtrackpro.com; los
 * avisos de la vista web (inicio de página, errores) llegan después por
 * la cola del hilo principal, así que el registrador los alcanza a ver
 * desde la primera carga. Lo único que se puede perder es la PRIMERA
 * consulta de shouldInterceptRequest, que corre en otro hilo.
 */
public class DebugApp extends Application {

    static final String TAG = "FixTrackDebug";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "registrador activo (compilación de prueba)");
        registerActivityLifecycleCallbacks(
            new ActivityLifecycleCallbacks() {
                @Override
                public void onActivityPostCreated(@NonNull Activity activity, @Nullable Bundle state) {
                    if (!(activity instanceof MainActivity)) return;
                    Bridge bridge = ((MainActivity) activity).getBridge();
                    if (bridge == null) {
                        Log.w(TAG, "sin puente de Capacitor al crear la actividad");
                        return;
                    }
                    DebugWebViewLogger.install(bridge, state != null);
                }

                @Override
                public void onActivityCreated(@NonNull Activity a, @Nullable Bundle s) {}

                @Override
                public void onActivityStarted(@NonNull Activity a) {
                    if (a instanceof MainActivity) Log.i(TAG, "actividad: primer plano");
                }

                @Override
                public void onActivityResumed(@NonNull Activity a) {}

                @Override
                public void onActivityPaused(@NonNull Activity a) {}

                @Override
                public void onActivityStopped(@NonNull Activity a) {
                    if (a instanceof MainActivity) Log.i(TAG, "actividad: segundo plano");
                }

                @Override
                public void onActivitySaveInstanceState(@NonNull Activity a, @NonNull Bundle s) {}

                @Override
                public void onActivityDestroyed(@NonNull Activity a) {}
            }
        );
    }
}
