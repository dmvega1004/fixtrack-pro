#!/usr/bin/env bash
# Comprobación OBLIGATORIA antes de publicar cualquier APK de release.
#
#   apps/mobile/scripts/verificar-release.sh [apk-release] [apk-publicado]
#
# Por defecto revisa android/app/build/outputs/apk/release/app-release.apk
# contra el que se descarga hoy (apps/web/public/app/fixtrackpro.apk).
#
# FALLA (sale con código 1) si la release:
#   - trae algo de la variante de prueba .debug (DebugApp, «FixTrackDebug»),
#   - es depurable,
#   - no es com.innovawebb.fixtrackpro,
#   - no está firmada con la MISMA llave que el APK publicado (si no, no se
#     instala encima y el técnico perdería sesión y datos guardados).
# INFORMA (sin fallar): versión, y qué archivos cambian frente al publicado
# (sin la firma). Para una recompilación de la misma versión debe decir
# «idénticas»; para una versión nueva, revisar que la lista tenga sentido.
set -euo pipefail

cd "$(dirname "$0")/.."
RELEASE=${1:-android/app/build/outputs/apk/release/app-release.apk}
PUBLISHED=${2:-../web/public/app/fixtrackpro.apk}
BT=$(ls -d "${ANDROID_HOME:-$HOME/Library/Android/sdk}"/build-tools/* | sort -V | tail -1)
fail=0
ok() { echo "  OK    $1"; }
bad() { echo "  FALLA $1"; fail=1; }

echo "Release:   $RELEASE"
echo "Publicado: $PUBLISHED"
[ -f "$RELEASE" ] || { echo "No existe $RELEASE"; exit 1; }

badging=$("$BT/aapt2" dump badging "$RELEASE")
pkg=$(echo "$badging" | sed -nE "s/^package: name='([^']+)'.*/\1/p")
ver=$(echo "$badging" | sed -nE "s/^package: .*versionCode='([^']+)' versionName='([^']+)'.*/\2 (versionCode \1)/p")
echo "Versión:   $ver"

[ "$pkg" = "com.innovawebb.fixtrackpro" ] && ok "applicationId ${pkg}" || bad "applicationId es «${pkg}»"

manifest=$("$BT/aapt2" dump xmltree --file AndroidManifest.xml "$RELEASE")
echo "$manifest" | grep -q DebugApp && bad "el manifiesto declara DebugApp" || ok "sin DebugApp en el manifiesto"
echo "$manifest" | grep -q "debuggable" && bad "la release es depurable" || ok "no es depurable"

marks=$(unzip -p "$RELEASE" 'classes*.dex' | LC_ALL=C grep -a -c -e FixTrackDebug -e DebugWebViewLogger || true)
[ "$marks" = "0" ] && ok "sin el registrador en el código" || bad "el código trae el registrador (${marks})"

if [ -f "$PUBLISHED" ]; then
  cert() { "$BT/apksigner" verify --print-certs "$1" | sed -nE 's/.*certificate SHA-256 digest: //p' | head -1; }
  c1=$(cert "$RELEASE" || true); c2=$(cert "$PUBLISHED" || true)
  if [ -n "$c1" ] && [ "$c1" = "$c2" ]; then ok "misma llave que el publicado (${c1:0:16}…)"; else bad "llave distinta o sin firma (release=${c1:-ninguna} publicado=${c2:-ninguna})"; fi

  list() { unzip -v "$1" | awk 'NR>3 && $8 != "" && $8 !~ /^META-INF/ {print $7, $8}' | sort -k2; }
  changes=$(diff <(list "$PUBLISHED") <(list "$RELEASE") | sed -nE 's/^[<>] [0-9a-f]+ //p' | sort -u || true)
  if [ -z "$changes" ]; then echo "  INFO  contenido idéntico al publicado (sin contar la firma)"
  else echo "  INFO  archivos que cambian frente al publicado:"; echo "$changes" | sed 's/^/          /'; fi
else
  bad "no encuentro el APK publicado para comparar llave"
fi

[ $fail -eq 0 ] && echo "RESULTADO: se puede publicar" || echo "RESULTADO: NO publicar"
exit $fail
