# Matriz de requisitos y evidencias

| Requisito | Implementación | Evidencia |
|---|---|---|
| Android Java/XML | app/src/main y layouts | APK y captura del emulador |
| Persistencia local | DatabaseHelper + SQLite | manual técnico y outbox |
| API REST | backend/src/api.mjs | URL y npm test |
| Hosting gratuito | Worker + D1 | health endpoint |
| CRUD | admin.js | manual y guion |
| Lista personalizada | AppointmentAdapter | Mis citas |
| Buscar/registrar/modificar/eliminar | input y acciones por fila | manual |
| Roles | Paciente/Administrador | API y portal |
| Concurrencia | índice único de horario | test de conflicto |
| Documentación | informe, modelos y manuales | carpeta final |
| Video | guion y MP4 | CitaFacil-Demo.mp4 |
