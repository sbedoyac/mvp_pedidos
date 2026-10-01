import mysql from 'mysql2/promise';
import 'dotenv/config';

/**
 * Pool de SOLO LECTURA contra la base de datos real `sgc` de Super Carnes JH.
 *
 * REGLA DURA (ver PLAN.md §1.1): este proyecto NUNCA escribe en `sgc`. La credencial
 * configurada en .env (SGC_DB_USER/SGC_DB_PASSWORD) es una cuenta de ADMINISTRADOR con
 * permisos de escritura reales — MySQL no nos protege aquí. Por eso la restricción de
 * "solo SELECT" se aplica EN CÓDIGO, no se asume del lado del servidor: usa siempre
 * `sgcQuery`/`sgcQueryOne` de este módulo (nunca `sgcPool` directo) para que cualquier
 * sentencia que no sea SELECT se rechace antes de llegar a la red.
 */
const rawPool = mysql.createPool({
  host: process.env.SGC_DB_HOST,
  port: Number(process.env.SGC_DB_PORT ?? 3306),
  user: process.env.SGC_DB_USER,
  password: process.env.SGC_DB_PASSWORD,
  database: process.env.SGC_DB_NAME ?? 'sgc',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // DECIMAL/NUMERIC de mysql2 vuelven como number, no string
});

function assertSelectOnly(sql: string): void {
  const primeraSentencia = sql.trim().split(';')[0]?.trim().toUpperCase() ?? '';
  if (!primeraSentencia.startsWith('SELECT') && !primeraSentencia.startsWith('SHOW') && !primeraSentencia.startsWith('EXPLAIN')) {
    throw new Error(
      `Bloqueado: solo se permiten consultas SELECT/SHOW/EXPLAIN contra sgc (regla dura de PLAN.md §1.1). Sentencia recibida: ${sql.slice(0, 80)}`,
    );
  }
  if (sql.includes(';') && sql.trim().split(';').filter((s) => s.trim()).length > 1) {
    throw new Error('Bloqueado: no se permiten sentencias múltiples contra sgc.');
  }
}

/** Ejecuta un SELECT de solo lectura contra sgc. Lanza si la sentencia no es SELECT/SHOW/EXPLAIN. */
export async function sgcQuery<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  assertSelectOnly(sql);
  const [rows] = await rawPool.query(sql, params);
  return rows as T[];
}

export async function sgcQueryOne<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined> {
  const rows = await sgcQuery<T>(sql, params);
  return rows[0];
}
