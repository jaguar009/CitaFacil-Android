PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS roles (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
 kind TEXT NOT NULL DEFAULT 'PACIENTE' CHECK(kind IN ('PACIENTE','ADMIN'))
);
INSERT OR IGNORE INTO roles(id,name,kind) VALUES(1,'Paciente','PACIENTE'),(2,'Administrador','ADMIN');
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, salt TEXT NOT NULL,
 role_id INTEGER NOT NULL DEFAULT 1 REFERENCES roles(id), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS login_limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS services (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
 description TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1))
);
CREATE TABLE IF NOT EXISTS professionals (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
 service_id INTEGER NOT NULL REFERENCES services(id), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1))
);
CREATE TABLE IF NOT EXISTS schedules (
 id INTEGER PRIMARY KEY AUTOINCREMENT, professional_id INTEGER NOT NULL REFERENCES professionals(id),
 date_label TEXT NOT NULL, time_label TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN(0,1)),
 UNIQUE(professional_id,date_label,time_label)
);
CREATE TABLE IF NOT EXISTS appointments (
 id INTEGER PRIMARY KEY AUTOINCREMENT, client_id TEXT NOT NULL,
 user_id INTEGER NOT NULL REFERENCES users(id), patient_name TEXT NOT NULL,
 schedule_id INTEGER NOT NULL REFERENCES schedules(id),
 status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK(status IN('PENDIENTE','CONFIRMADA','ATENDIDA','CANCELADA')),
 archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN(0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(user_id,client_id)
);
-- Una sola reserva por horario, incluso si llegan dos peticiones al mismo tiempo.
CREATE UNIQUE INDEX IF NOT EXISTS single_booking ON appointments(schedule_id) WHERE status != 'CANCELADA';
CREATE INDEX IF NOT EXISTS appointments_user ON appointments(user_id,id);
CREATE INDEX IF NOT EXISTS schedules_date ON schedules(date_label,time_label);
CREATE INDEX IF NOT EXISTS professionals_service ON professionals(service_id);
