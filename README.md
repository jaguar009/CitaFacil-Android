# CitaFácil

Proyecto del curso **Desarrollo de Aplicaciones Móviles I**. Incluye una aplicación Android en Java/XML para reservar citas, una API REST con base de datos y un portal web administrativo. Los servicios y profesionales son datos ficticios de demostración.

## Abrir en Android Studio

1. Descarga este repositorio con **Code → Download ZIP** y descomprímelo. También puedes clonarlo con `git clone`.
2. En Android Studio elige **Open** y selecciona la carpeta **CitaFacil** que contiene `settings.gradle.kts`, `gradlew.bat` y `app/`. No abras solo `app/`.
3. Espera a que Gradle sincronice y descargue sus dependencias. Acepta instalar el Android SDK que pida el IDE. El proyecto usa **compileSdk 37**, **minSdk 24** y el wrapper **Gradle 9.6**.
4. Selecciona un emulador o teléfono Android y pulsa **Run ▶** sobre la configuración **app**.
5. En la pantalla de inicio crea una cuenta de paciente con tu propio correo de prueba y una contraseña de al menos 10 caracteres. La app se conecta por HTTPS a la API académica configurada en [ApiClient.java](app/src/main/java/com/example/myapplication/data/remote/ApiClient.java).

En Windows PowerShell puedes compilar desde la carpeta raíz con `.\gradlew.bat assembleDebug`. El APK se genera en `app/build/outputs/apk/debug/app-debug.apk`. El archivo `entregables/02-final/CitaFacil-debug.apk` es una copia de demostración.

## Cómo está organizado

| Carpeta | Contenido |
|---|---|
| `app/src/main/java` | Actividades Android, modelos, SQLite, cliente REST y sincronización |
| `app/src/main/res` | Pantallas XML, tema y recursos |
| `backend/src` | API, autenticación, seguridad y Worker |
| `backend/migrations` | Esquema SQL de la base remota |
| `backend/public` | Portal administrativo |
| `backend/test` | Pruebas automáticas de la API |
| `docs` | Análisis, diseño, casos de uso y pruebas |
| `entregables/02-final` | Informe, manuales, diagramas, video y APK |

## Backend y portal

La app Android usa la API publicada en `https://citafacil.jaguar009.workers.dev`. Para **abrir y ejecutar Android**, tus compañeros no necesitan una cuenta Cloudflare ni ejecutar Node.js. El panel administrativo está en `https://citafacil.jaguar009.workers.dev/admin.html` y requiere una cuenta de administrador.

Para explorar el backend localmente, lee [backend/README.md](backend/README.md). La base de datos local se crea en `backend/data/` y no forma parte del repositorio. El despliegue Cloudflare del curso usa una cuenta ajena al clon: publicar una copia propia exige crear una base D1 y configurar `backend/wrangler.jsonc` con su identificador.

## Comprobación rápida

- Android: `.\gradlew.bat assembleDebug testDebugUnitTest` en Windows PowerShell, o `./gradlew assembleDebug testDebugUnitTest` en macOS/Linux.
- Backend: `cd backend`, `npm ci`, `npm test` con Node.js 22.13 o superior.
- Salud de la API publicada: `https://citafacil.jaguar009.workers.dev/api/health`.

## Datos y autoría

No se publican contraseñas, tokens, bases locales, archivos `local.properties`, cachés ni configuraciones personales del IDE. La app permite registrar cuentas de prueba. La implementación recibió asistencia de Codex; cada integrante debe comprender el código y documentar su participación real antes de presentarlo.
