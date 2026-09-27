# Casos de uso y flujos

## Actores

- Usuario: consulta horarios y gestiona sus citas.
- Administrador: mantiene catálogos y gestiona el estado de las citas.

## Casos de uso principales

| Código | Caso de uso | Actor |
|---|---|---|
| CU01 | Consultar servicios | Usuario |
| CU02 | Consultar profesionales | Usuario |
| CU03 | Consultar horarios | Usuario |
| CU04 | Reservar cita | Usuario |
| CU05 | Consultar mis citas | Usuario |
| CU06 | Cancelar cita | Usuario |
| CU07 | Mantener servicios | Administrador |
| CU08 | Mantener profesionales | Administrador |
| CU09 | Mantener horarios | Administrador |
| CU10 | Gestionar estados de citas | Administrador |

## Flujo de reserva

1. El usuario ingresa sus datos.
2. Selecciona un servicio.
3. Selecciona un profesional.
4. Selecciona un horario disponible.
5. El sistema valida los datos.
6. La cita se guarda localmente.
7. La cita queda pendiente de sincronización o se envía al servicio REST.

## Flujo de cancelación

1. El usuario selecciona una cita.
2. Presiona cancelar.
3. El sistema cambia su estado a CANCELADA.
4. La aplicación actualiza la lista.
