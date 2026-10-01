import type { Database } from 'sql.js';

export function ensureSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_entrega TEXT NOT NULL,
      cliente TEXT NOT NULL,
      sucursal TEXT NOT NULL,
      especie TEXT NOT NULL CHECK (especie IN ('cerdo', 'res')),
      cantidad_animales INTEGER NOT NULL,
      estado TEXT NOT NULL DEFAULT 'borrador',
      origen TEXT NOT NULL DEFAULT 'punto_venta' CHECK (origen IN ('punto_venta', 'planta')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pedido_lineas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      producto_id INTEGER NOT NULL,
      cantidad REAL NOT NULL,
      presentacion TEXT NOT NULL CHECK (presentacion IN ('vacio', 'granel')),
      especificacion TEXT
    );

    CREATE TABLE IF NOT EXISTS pedido_retomas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      producto_id INTEGER NOT NULL,
      nota TEXT,
      cantidad REAL
    );
  `);

  // Migración 2026-09-23: pedido_retomas ganó `cantidad` (piezas retomadas, ver CLAUDE.md
  // §6.13) después de que algunas DBs de desarrollo ya existieran sin esa columna —
  // CREATE TABLE IF NOT EXISTS no altera tablas ya creadas, así que hace falta ALTER TABLE
  // explícito. Envuelto en try/catch porque SQLite no tiene "ADD COLUMN IF NOT EXISTS": en una
  // DB nueva la columna ya viene del CREATE TABLE de arriba y este ALTER fallaría (columna
  // duplicada) — el catch absorbe justo ese caso esperado, no otros errores reales.
  try {
    db.run(`ALTER TABLE pedido_retomas ADD COLUMN cantidad REAL`);
  } catch {
    // columna ya existe (DB nueva, o migración ya aplicada antes) — no hacer nada
  }

  // Migración 2026-09-23: pedidos ganó `origen` (punto_venta | planta, ver CLAUDE.md §6.14 —
  // vista de Programación semanal) por la misma razón que la migración de arriba.
  try {
    db.run(`ALTER TABLE pedidos ADD COLUMN origen TEXT NOT NULL DEFAULT 'punto_venta'`);
  } catch {
    // columna ya existe — no hacer nada
  }
}
