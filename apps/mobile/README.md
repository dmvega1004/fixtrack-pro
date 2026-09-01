# FixTrack Pro — Android (Capacitor)

Esta carpeta es una **cáscara nativa**: una app de Android que abre
`https://fixtrackpro.com` dentro de una vista web (WebView) y le agrega lo
que un navegador no da — ícono propio, pantalla de arranque, funciona sin
tener que instalarse desde el navegador, permisos nativos de cámara, etc.

**No contiene ninguna copia de la aplicación web.** Todo el HTML/CSS/JS
sigue viviendo y publicándose desde `apps/web`, exactamente igual que
ahora.

## Qué cambios requieren recompilar el APK (y cuáles no)

Esto es lo más importante de entender antes de tocar nada:

- **Casi ningún cambio en la web requiere recompilar.** Como la app carga
  `https://fixtrackpro.com` en vivo, cualquier cosa que despliegues ahí
  —una pantalla nueva, un fix, un texto, una funcionalidad— aparece dentro
  de la app instalada en los celulares apenas el usuario la abre (o la
  vuelve a abrir), sin que nadie tenga que reinstalar nada. Es el mismo
  flujo de publicación de siempre.

- **Sí hay que recompilar y volver a distribuir el APK/AAB cuando cambia
  algo de la cáscara nativa misma**, es decir, algo de esta carpeta
  (`apps/mobile/`):
  - El ícono o la pantalla de arranque (`assets/logo.png` y sus salidas).
  - Los permisos de Android (`AndroidManifest.xml`).
  - El comportamiento del botón atrás, la pantalla sin conexión, o
    cualquier otro archivo bajo `android/`.
  - El número de versión (`versionCode` / `versionName`).
  - La URL de destino (`capacitor.config.ts`, `server.url`).

En resumen: los cambios de producto y de negocio en la web nunca tocan
esta carpeta. Solo hay que volver aquí cuando cambia algo de "cómo se
comporta la app como app".

## Requisitos

- Node y pnpm (ya instalados si estás en este monorepo).
- [Android Studio](https://developer.android.com/studio) instalado (trae
  el SDK de Android y un JDK compatible).
- El JDK de Android Studio. Este proyecto necesita **JDK 21**, y el que
  trae Homebrew por defecto puede ser una versión distinta. Si `./gradlew`
  falla con un error de tipo `invalid source release`, apunta `JAVA_HOME`
  al JDK embebido de Android Studio antes de compilar:

  ```bash
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  ```

## Instalar dependencias

Desde la raíz del monorepo:

```bash
pnpm install
```

## Compilar el APK de depuración (debug)

El APK de debug sirve para instalar y probar en un celular real; no
requiere llave de firma.

```bash
cd apps/mobile
pnpm android:build:debug
```

Esto ejecuta Gradle y genera el archivo en:

```
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Para instalarlo en un celular conectado por USB con depuración habilitada:

```bash
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

O simplemente copia el `.apk` al celular y ábrelo (hay que permitir
"instalar apps de orígenes desconocidos" la primera vez).

## Generar la llave de firma (una sola vez, la primera vez)

La llave de firma es lo que identifica a la app como "la app de FixTrack
Pro" ante Android y ante Google Play. **Si se pierde o se filtra, no se
pueden volver a publicar actualizaciones de esta misma app nunca más** —
habría que publicarla como una app nueva y todos los usuarios perderían
su instalación actual. Por eso:

- No se genera como parte de este encargo.
- No se guarda en este repositorio (está en `.gitignore`).
- La generas tú, una sola vez, y la guardas en un lugar seguro con
  respaldo (gestor de contraseñas de la empresa, backup cifrado, etc.),
  fuera de cualquier carpeta de git.

### Paso a paso

1. Genera el archivo de llave con `keytool` (viene con el JDK; si tienes
   Android Studio instalado ya lo tienes disponible). Ejecuta esto **fuera
   del repositorio**, por ejemplo en tu carpeta de usuario:

   ```bash
   keytool -genkeypair -v \
     -keystore ~/fixtrackpro-release.jks \
     -alias fixtrackpro \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

   Te va a pedir una contraseña para el keystore, una contraseña para la
   llave (pueden ser la misma), y algunos datos (nombre, organización,
   país) que solo quedan como metadata del certificado — no son
   sensibles, pero tampoco importa si los dejas genéricos.

   Guarda **el archivo `.jks` generado y ambas contraseñas** en un lugar
   seguro. Sin los tres, no se puede firmar ninguna actualización futura.

2. En `apps/mobile/android/`, copia la plantilla:

   ```bash
   cd apps/mobile/android
   cp key.properties.example key.properties
   ```

3. Edita `key.properties` con los datos reales:

   ```properties
   storeFile=/ruta/absoluta/a/fixtrackpro-release.jks
   storePassword=la-contraseña-del-keystore
   keyAlias=fixtrackpro
   keyPassword=la-contraseña-de-la-llave
   ```

   `key.properties` está en `.gitignore` — Gradle lo lee en cada build
   pero nunca se sube a git. Si `key.properties` no existe, el build de
   release sigue compilando (para poder probar), pero el APK/AAB queda
   **sin firmar** y no sirve para publicar ni para instalar en un celular
   que ya tenga una versión firmada instalada.

## Compilar una versión firmada (release)

Con `key.properties` ya configurado:

```bash
cd apps/mobile
pnpm android:build:release
```

Archivo generado:

```
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

Este es el que se distribuye fuera de Google Play (instalación directa,
enlace de descarga, etc.).

## Subir el número de versión

Antes de compilar una versión nueva para distribuir, edita
`apps/mobile/android/app/build.gradle`, dentro de `defaultConfig`:

```gradle
versionCode 1        // sube en 1 en cada versión que publiques (2, 3, 4…)
versionName "1.0.0"   // el número que ve el usuario; súbelo como prefieras (1.0.1, 1.1.0…)
```

- `versionCode` es un entero interno que Android usa para saber si una
  versión es "más nueva" que otra. **Tiene que subir siempre**, sin
  excepción, o Android/Google Play rechazan la actualización.
- `versionName` es el texto que ve la gente (en Ajustes → Apps, por
  ejemplo). Súbelo con el criterio que prefieras (semver, fecha, etc.).

## Publicar en Google Play

Cuando llegue el momento, el proceso es distinto al de distribuir un APK
suelto:

1. **Google Play exige el formato AAB (Android App Bundle), no APK.**
   Se genera así:

   ```bash
   cd apps/mobile
   pnpm android:build:bundle
   ```

   Archivo generado:

   ```
   apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
   ```

   (Requiere `key.properties` configurado, igual que el APK de release —
   Google Play no acepta un AAB sin firmar).

2. Crea una cuenta de **Google Play Console**
   (https://play.google.com/console) — tiene un costo único de
   inscripción por cuenta de desarrollador.

3. Crea la ficha de la app: nombre, descripción corta y larga, capturas
   de pantalla (celular como mínimo), ícono de 512×512, gráfico de
   funciones (feature graphic) de 1024×500, categoría, clasificación de
   contenido (cuestionario dentro de la consola), política de privacidad
   (una URL — necesaria incluso para apps internas/gratuitas).

4. En la sección **Producción** (o primero en una pista de **Pruebas
   internas/cerradas**, recomendable para el primer envío), sube el
   `app-release.aab` generado en el paso 1.

5. Completa el cuestionario de **contenido de la app** (uso de datos,
   permisos declarados — aquí va a preguntar por qué se usa el permiso de
   cámara; la respuesta es: escaneo de códigos QR y captura de fotos
   dentro del flujo de trabajo de la app).

6. Envía a revisión. Google puede tardar de horas a pocos días en la
   primera revisión.

7. **Para versiones futuras**: sube el `versionCode`, vuelve a generar el
   AAB (`pnpm android:build:bundle`), y súbelo como una nueva versión
   dentro de la misma ficha en Play Console. La firma tiene que ser
   siempre con la misma llave (`key.properties` apuntando al mismo
   `.jks`) — por eso es tan importante no perderla.

## Ícono y splash

Se generan a partir de `apps/mobile/assets/logo.png` (el logo de marca con
el fondo recortado a transparente) usando `@capacitor/assets`. Si cambia
el logo de marca:

```bash
cd apps/mobile
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#FAFAFA' --iconBackgroundColorDark '#FAFAFA' \
  --splashBackgroundColor '#FAFAFA' --splashBackgroundColorDark '#FAFAFA'
```

⚠️ Después de regenerar, revisa `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
y `ic_launcher_round.xml`: la herramienta aplica el mismo margen de
seguridad (16.7%) a las dos capas del ícono adaptativo (fondo y primer
plano), y eso dejaba un borde transparente visible en máscaras circulares
porque el fondo también quedaba encogido. Hay que dejar el `<background>`
**sin** el `<inset>` (para que llegue hasta el borde) y el `<inset>`
solo en el `<foreground>` (para que el logo no quede recortado). Si
vuelves a correr el comando de arriba, ese archivo se sobreescribe y hay
que corregirlo de nuevo a mano.

## Pantalla sin conexión

`www/offline.html` es la pantalla que se muestra si falla la carga de
`fixtrackpro.com` (sin red, DNS, etc.), en vez del error feo del
navegador. Está conectada vía `server.errorPath` en `capacitor.config.ts`
— es un mecanismo propio de Capacitor: esa página se sirve siempre desde
los archivos empaquetados en el APK (no desde internet), así que funciona
exactamente en el escenario en que tiene que funcionar. Después de
editarla hay que correr `pnpm sync` para que se copie al proyecto Android.

## Qué probar en un celular real

Esto no se puede verificar desde acá — instala `app-debug.apk` en un
celular Android real y prueba:

- [ ] La app instala y abre mostrando la pantalla de arranque y luego
      `fixtrackpro.com`.
- [ ] **Cámara**: el escáner de código QR pide permiso de cámara la
      primera vez y, al aceptarlo, la cámara efectivamente arranca (no se
      queda en blanco ni sin reaccionar).
- [ ] **Foto desde cámara**: cualquier flujo que suba una foto ofrece la
      opción de tomarla con la cámara, y la foto sube correctamente.
- [ ] **Foto desde galería**: el mismo flujo también permite elegir una
      foto ya existente del celular.
- [ ] **Inicio de sesión**: login normal, cookies/sesión persisten al
      cerrar y volver a abrir la app.
- [ ] **Botón atrás físico**: navega hacia atrás dentro de la app
      (regresa a la pantalla anterior); solo cierra la app cuando ya no
      hay más pantallas atrás.
- [ ] **Pantalla sin conexión**: activa modo avión, abre la app (o fuerza
      un reload) y confirma que aparece la pantalla en español con el
      botón "Reintentar" — no el error del navegador. Desactiva modo
      avión y toca "Reintentar": debe volver a cargar la app normalmente.
- [ ] **Ícono**: revisa cómo se ve en la pantalla de inicio y en el cajón
      de apps, especialmente si el lanzador del celular usa íconos
      circulares o con forma de rombo — el logo no debe verse cortado.

## Estructura de esta carpeta

```
apps/mobile/
├── android/              proyecto nativo generado por Capacitor (no editar a mano salvo lo documentado aquí)
├── assets/                logo fuente para generar ícono y splash
├── www/                   solo offline.html (pantalla sin conexión) e index.html (placeholder, no se usa)
├── capacitor.config.ts    appId, appName, server.url, errorPath
└── package.json           scripts de compilación
```
