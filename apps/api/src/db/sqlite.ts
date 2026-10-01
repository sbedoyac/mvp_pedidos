import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import initSqlJs, { type Database } from 'sql.js';

const require = createRequire(import.meta.url);

/**
 * Base de datos PROPIA del MVP (pedidos, líneas, retomas) — nunca es `sgc`.
 * sql.js es SQLite compilado a WASM: no requiere Python/Build Tools para compilar,
 * a diferencia de better-sqlite3 (ver PLAN.md §Fase 0.3 — ese problema ya ocurrió en
 * superops_jh en el mismo servidor Windows destino). El costo es que vive en memoria y
 * hay que persistirla a archivo explícitamente tras cada escritura.
 */

const DB_PATH = process.env.MVP_DB_PATH ?? 'data/mvp_pedidos.sqlite3';

let db: Database | undefined;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs({
    locateFile: (file) => require.resolve(`sql.js/dist/${file}`),
  });

  if (existsSync(DB_PATH)) {
    db = new SQL.Database(readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
    mkdirSync(dirname(DB_PATH), { recursive: true });
  }

  return db;
}

/** Escribe el estado actual en memoria al archivo. Llamar tras cada operación de escritura. */
export function persist(): void {
  if (!db) return;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, Buffer.from(db.export()));
}
