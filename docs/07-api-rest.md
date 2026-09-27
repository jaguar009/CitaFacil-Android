# API REST de CitaFácil

## Publicación

- Base: https://citafacil.jaguar009.workers.dev
- Salud: GET /api/health
- Panel: /admin.html

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/auth/register | Registra paciente |
| POST | /api/auth/login | Crea sesión |
| GET | /api/auth/me | Devuelve sesión actual |
| POST | /api/auth/logout | Revoca sesión |
| GET | /api/catalog | Catálogo y horarios |
| GET | /api/appointments | Citas del usuario |
| POST | /api/appointments | Crea o reintenta reserva |
| POST | /api/appointments/:id/cancel | Cancela una cita propia |
| GET/POST/PUT/DELETE | /api/admin/* | CRUD y filtros administrativos |

## Seguridad

Sesiones con token hash, PBKDF2, origen permitido, JSON limitado, validación de campos, autorización por rol y parámetros preparados.
