import { Router } from 'express';
import { crearPedido, listarPedidos, obtenerPedido } from '../db/pedidos.js';
import type { PedidoInput } from '../db/types.js';

export const pedidosRouter = Router();

function validarPedidoInput(body: unknown): body is PedidoInput {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.fechaEntrega === 'string' &&
    typeof b.cliente === 'string' &&
    typeof b.sucursal === 'string' &&
    (b.especie === 'cerdo' || b.especie === 'res') &&
    typeof b.cantidadAnimales === 'number' &&
    Array.isArray(b.lineas) &&
    Array.isArray(b.retomas) &&
    (b.origen === undefined || b.origen === 'punto_venta' || b.origen === 'planta')
  );
}

pedidosRouter.post('/api/pedidos', async (req, res) => {
  if (!validarPedidoInput(req.body)) {
    res.status(400).json({ error: 'Cuerpo de pedido inválido' });
    return;
  }
  try {
    const id = await crearPedido(req.body);
    res.status(201).json({ id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

pedidosRouter.get('/api/pedidos', async (_req, res) => {
  try {
    res.json(await listarPedidos());
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

pedidosRouter.get('/api/pedidos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'id inválido' });
    return;
  }
  try {
    const pedido = await obtenerPedido(id);
    if (!pedido) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
    res.json(pedido);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
