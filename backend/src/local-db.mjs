import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

// Adaptador pequeño: usa la misma interfaz prepare/bind que D1, pero con SQLite local.
export function openDatabase(filename) {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec(readFileSync(new URL('../migrations/0001_citafacil.sql', import.meta.url), 'utf8'));
  return {
    sqlite,
    prepare(sql) {
      let params = [];
      return {
        bind(...values) { params = values; return this; },
        async first() { return sqlite.prepare(sql).get(...params) || null; },
        async all() { return {results: sqlite.prepare(sql).all(...params)}; },
        async run() { const r = sqlite.prepare(sql).run(...params); return {meta:{changes:Number(r.changes), last_row_id:Number(r.lastInsertRowid)}}; }
      };
    }
  };
}
