# Problema y alcance

## Problema

Los pequeños consultorios y centros de servicios suelen coordinar citas mediante llamadas, mensajes o apuntes manuales. Esto puede producir horarios duplicados, pérdida de información y poca visibilidad del estado.

## Solución

CitaFácil centraliza catálogo, profesionales, horarios y reservas desde Android. El paciente conserva una solicitud en SQLite cuando está offline y la sincroniza mediante REST. El personal administra la información desde un portal web.

## Incluido

- Registro, login, sesión segura y roles.
- Consulta de servicios, profesionales y horarios.
- Registro, edición, cancelación y ocultamiento local de citas.
- Lista personalizada con búsqueda.
- Cola local e idempotencia mediante client_id.
- API REST y base D1.
- CRUD administrativo de roles, usuarios, servicios, profesionales, horarios, citas y sesiones.
- Pruebas y documentación.

## Fuera de alcance

Historias clínicas, diagnóstico, tratamiento, pagos, videollamadas, chat, notificaciones, recuperación de contraseña, Play Store y operación clínica real.
