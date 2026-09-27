# Manual técnico de CitaFácil

## Requisitos
- Android Studio con SDK API 37 y Java 11.
- Node.js 22.13 o superior.
- Navegador moderno.
- Cuenta Cloudflare solo para volver a desplegar.

## Android
Desde la carpeta del proyecto:
  ~~~
  .\gradlew.bat assembleDebug
  .\gradlew.bat testDebugUnitTest
  ~~~
APK: app/build/outputs/apk/debug/app-debug.apk. La app usa SQLite v2 y cifra la sesión con Android Keystore.

## Backend local
  ~~~
  cd backend
  npm install
  npm test
  npm start
  ~~~
La base local es backend/data/citafacil-v2.db y la migración es migrations/0001_citafacil.sql.

## Despliegue y seguridad
El Worker publicado es citafacil y usa D1 citafacil-academico. No subir private/, backend/data/, node_modules/ ni .wrangler/. Antes de producción agregar rotación de secretos, monitoreo, recuperación de cuenta y revisión legal.
