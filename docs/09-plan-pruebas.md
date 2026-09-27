# Plan de pruebas

| Código | Prueba | Resultado |
|---|---|---|
| P01 | Registro, login y rol paciente | Aprobada |
| P02 | Aislamiento de citas entre usuarios | Aprobada |
| P03 | Reintento idempotente con client_id | Aprobada |
| P04 | Dos reservas concurrentes para el mismo horario | Una válida y un conflicto |
| P05 | Cancelación propia e idempotencia | Aprobada |
| P06 | CRUD administrativo y filtros | Aprobada |
| P07 | Protección de roles base y terminales | Aprobada |
| P08 | JSON inválido, origen y validación | Aprobada |
| P09 | SQLite offline y cola local | Verificada en Android |
| P10 | Build Android y pruebas unitarias | BUILD SUCCESSFUL |

Comando backend: npm test. Comandos Android: .\gradlew.bat assembleDebug y .\gradlew.bat testDebugUnitTest.
