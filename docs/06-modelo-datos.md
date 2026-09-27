# Modelo de datos

## Tablas

roles, users, services, professionals, schedules, appointments, sessions y login_limits.

## Relaciones

- Un rol tiene muchos usuarios.
- Un servicio tiene muchos profesionales.
- Un profesional tiene muchos horarios.
- Un usuario tiene muchas citas.
- Una cita referencia usuario y horario.
- Una sesión pertenece a un usuario.

## Reglas

- El correo es único.
- Solo un horario puede tener una cita no cancelada.
- El paciente solo consulta sus propias citas.
- client_id permite reintentos idempotentes.
- PENDIENTE puede pasar a CONFIRMADA o CANCELADA.
- CONFIRMADA puede pasar a ATENDIDA o CANCELADA.
- Una cita ATENDIDA no se cancela.
- La migración completa está en entregables/02-final/CitaFacil-Esquema.sql.
