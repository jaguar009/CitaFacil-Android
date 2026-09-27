# Requerimientos

## Funcionales

- RF01: Registrar e iniciar sesión como paciente.
- RF02: Consultar servicios, profesionales y horarios activos.
- RF03: Registrar una solicitud de cita con client_id.
- RF04: Consultar solo las citas del usuario autenticado.
- RF05: Buscar, editar, cancelar y eliminar localmente una cita según su estado.
- RF06: Conservar cambios en SQLite sin conexión.
- RF07: Sincronizar cambios y catálogo por REST.
- RF08: Evitar duplicar un horario en reservas concurrentes.
- RF09: Administrar roles, usuarios, servicios, profesionales, horarios, citas y sesiones.
- RF10: Filtrar citas administrativas por estado, servicio y fecha.

## No funcionales

- RNF01: Java y XML en Android.
- RNF02: Validación de entrada y mensajes claros.
- RNF03: Separación por presentación, lógica y datos.
- RNF04: JSON y consultas preparadas.
- RNF05: Contraseñas derivadas con PBKDF2 y tokens de sesión con expiración.
- RNF06: Escape de datos visibles en el portal.
- RNF07: Configuración compatible con el hosting gratuito solicitado.
