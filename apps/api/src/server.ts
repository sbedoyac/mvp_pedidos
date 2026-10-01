import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { ensureSchema } from './db/schema.js';
import { getDb, persist } from './db/sqlite.js';
import { clientesRouter } from './routes/clientes.js';
import { healthRouter } from './routes/health.js';
import { pedidosRouter } from './routes/pedidos.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:5173' }));
app.use(express.json());
app.use('/', healthRouter);
app.use('/', clientesRouter);
app.use('/', pedidosRouter);

const PORT = Number(process.env.PORT ?? 4000);

async function main() {
  const db = await getDb();
  ensureSchema(db);
  persist();

  app.listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
