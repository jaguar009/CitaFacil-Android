# API REST de CitaFácil

Backend académico escrito en JavaScript con la API Fetch y SQLite. Node.js 22.13 o superior permite ejecutarlo localmente; Cloudflare Workers y D1 son la configuración publicada.

## Ejecutar pruebas

```powershell
npm ci
npm test
```

## Servidor local

```powershell
npm start
```

El portal local queda en `http://localhost:3000/admin.html` y la comprobación de salud en `http://localhost:3000/api/health`. El servidor crea su propia base en `backend/data/`. Para habilitar el administrador local, define `ADMIN_EMAIL` y `ADMIN_PASSWORD` antes de iniciar el servidor; usa valores propios de prueba y no publiques contraseñas.

La app incluida apunta a la API académica publicada por HTTPS. Ejecutar un backend local requiere cambiar esa URL en Android y configurar el acceso local del emulador.

## Despliegue en Cloudflare

`wrangler.jsonc` describe el Worker y la migración D1. Para desplegar una instancia propia, crea una base D1 en tu cuenta, configura su identificador en ese archivo, ejecuta la migración y despliega con Wrangler autenticado. El identificador de base incluido corresponde a la demo académica publicada.

El archivo de migración está en `migrations/0001_citafacil.sql`; las pruebas de API en `test/api.test.mjs`.
