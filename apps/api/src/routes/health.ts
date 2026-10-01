import { Router } from 'express';
import { sgcQuery } from '../sgc/db.js';

export const healthRouter = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/** Verifica que las credenciales configuradas en .env pueden leer (SELECT) de `sgc`. */
healthRouter.get('/health-sgc', async (_req, res) => {
  try {
    await sgcQuery('SELECT 1');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
});
