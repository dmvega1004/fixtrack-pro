import type { CapacitorConfig } from '@capacitor/cli';

// Cascara nativa: la app NO se empaqueta localmente, siempre carga la web
// de produccion. Un despliegue en fixtrackpro.com queda disponible dentro
// de la app sin recompilar ni volver a distribuir el APK.
const config: CapacitorConfig = {
  appId: 'com.taelco.fixtrackpro',
  appName: 'FixTrack Pro',
  webDir: 'www',
  server: {
    url: 'https://fixtrackpro.com',
    androidScheme: 'https',
    // Si falla la carga de la pagina principal (sin red, DNS, etc.), la
    // vista web muestra esta pagina local en vez del error del navegador.
    // Se sirve desde los assets empaquetados (www/offline.html), no desde
    // fixtrackpro.com, asi que funciona exactamente cuando no hay conexion.
    errorPath: 'offline.html',
  },
  // Marca el user-agent de la WebView para que el sitio distinga la app
  // instalada de un navegador y NUNCA le muestre la landing comercial a
  // quien ya abrio la app (ver apps/web/src/proxy.ts, isAppWebView).
  // OJO: solo surte efecto tras `npx cap sync` y redistribuir el APK; los
  // APK ya instalados se siguen detectando por el token `wv` de Android.
  appendUserAgent: 'FixTrackApp',
};

export default config;
