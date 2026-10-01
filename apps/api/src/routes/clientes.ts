import { Router } from 'express';
import { sgcQuery } from '../sgc/db.js';

export const clientesRouter = Router();

interface ClienteRow {
  terceroId: number;
  terceroNombre: string;
  sucursalId: number;
  sucursalNombre: string;
}

/**
 * Cache en memoria, TTL 5 min — mismo patrón que apps/api/src/routes/despachos.ts de
 * superops_jh, para no golpear `sgc` en cada tecla del buscador del selector Cliente/Sucursal.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { at: number; clientes: ClienteRow[] } | undefined;

async function obtenerClientes(): Promise<ClienteRow[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.clientes;
  }

  const clientes = await sgcQuery<ClienteRow>(
    `SELECT t.id AS terceroId, t.nombre AS terceroNombre,
            ts.id AS sucursalId, ts.nombre AS sucursalNombre
     FROM tercero_sucursales ts
     JOIN terceros t ON t.id = ts.tercero_id
     ORDER BY t.nombre, ts.nombre`,
  );

  cache = { at: Date.now(), clientes };
  return clientes;
}

/** GET /api/clientes — Cliente (terceros.nombre) + Sucursal (tercero_sucursales.nombre), solo lectura de sgc. */
clientesRouter.get('/api/clientes', async (_req, res) => {
  try {
    const clientes = await obtenerClientes();
    res.json(clientes);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
