package com.taelco.fixtrackpro;

import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * Puente a la hoja de compartir de Android para imagenes generadas en la web.
 *
 * La vista web de Capacitor (WebView) ignora el atributo download de los
 * enlaces: un <a download> con un data URL no descarga nada, sin aviso ni
 * error. En lugar de emular una descarga, este plugin escribe la imagen en
 * la cache de la app y abre la hoja de compartir del sistema, desde donde
 * el tecnico la manda a la app de la impresora, a la galeria o por
 * WhatsApp.
 *
 * El archivo se expone con el FileProvider ya declarado en el manifest
 * (cache-path en res/xml/file_paths.xml). Conserva el nombre que manda la
 * web, que es el que ve quien lo recibe.
 */
@CapacitorPlugin(name = "FileShare")
public class FileSharePlugin extends Plugin {

    // Subcarpeta propia dentro de la cache: se vacia antes de cada escritura
    // para que las imagenes compartidas no se acumulen.
    private static final String SHARE_DIR = "shared-images";
    private static final String FALLBACK_FILENAME = "imagen.png";

    @PluginMethod
    public void shareImage(PluginCall call) {
        String data = call.getString("data");
        String filename = call.getString("filename");
        String title = call.getString("title", "Compartir");

        if (data == null || data.isEmpty()) {
            call.reject("No se recibio la imagen a compartir");
            return;
        }

        // Acepta tanto un data URL completo como el base64 pelado.
        int comma = data.indexOf(',');
        if (data.startsWith("data:") && comma >= 0) {
            data = data.substring(comma + 1);
        }

        byte[] bytes;
        try {
            bytes = Base64.decode(data, Base64.DEFAULT);
        } catch (IllegalArgumentException e) {
            call.reject("La imagen recibida no es base64 valido", e);
            return;
        }

        File dir = new File(getContext().getCacheDir(), SHARE_DIR);
        File[] previous = dir.listFiles();
        if (previous != null) {
            for (File old : previous) {
                old.delete();
            }
        }
        if (!dir.isDirectory() && !dir.mkdirs()) {
            call.reject("No se pudo preparar la carpeta temporal");
            return;
        }

        File file = new File(dir, sanitizeFilename(filename));
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(bytes);
        } catch (IOException e) {
            call.reject("No se pudo guardar la imagen temporal", e);
            return;
        }

        Activity activity = getActivity();
        Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", file);

        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("image/png");
        send.putExtra(Intent.EXTRA_STREAM, uri);
        // ClipData ademas de EXTRA_STREAM: es lo que hace que el permiso de
        // lectura temporal viaje con el intent a traves del selector.
        send.setClipData(ClipData.newRawUri(file.getName(), uri));
        send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

        Intent chooser = Intent.createChooser(send, title);

        // Escribir el archivo puede ir en el hilo del plugin; abrir la
        // actividad se hace en el hilo principal.
        activity.runOnUiThread(() -> {
            try {
                activity.startActivity(chooser);
                call.resolve();
            } catch (RuntimeException e) {
                call.reject("No se pudo abrir la hoja de compartir", e);
            }
        });
    }

    /**
     * Solo el nombre (sin rutas) y solo caracteres seguros para el sistema de
     * archivos. Si no queda nada utilizable, usa un nombre generico.
     */
    private static String sanitizeFilename(String filename) {
        if (filename == null) {
            return FALLBACK_FILENAME;
        }
        String name = new File(filename).getName().replaceAll("[^A-Za-z0-9._-]", "_");
        if (name.isEmpty() || name.startsWith(".")) {
            return FALLBACK_FILENAME;
        }
        return name;
    }
}
