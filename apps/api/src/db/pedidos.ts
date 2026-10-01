import type { Database } from 'sql.js';
import { getDb, persist } from './sqlite.js';
import type {
  Especie,
  Origen,
  Pedido,
  PedidoInput,
  PedidoLinea,
  PedidoResumen,
  PedidoRetoma,
  Presentacion,
} from './types.js';

function run(db: Database, sql: string, params: (string | number | null)[] = []): void {
  db.run(sql, params);
}

function queryAll<T>(db: Database, sql: string, params: (string | number | null)[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

function lastInsertId(db: Database): number {
  const [row] = queryAll<{ id: number }>(db, 'SELECT last_insert_rowid() AS id');
  return row.id;
}

export async function crearPedido(input: PedidoInput): Promise<number> {
  const db = await getDb();

  run(
    db,
    `INSERT INTO pedidos (fecha_entrega, cliente, sucursal, especie, cantidad_animales, origen)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.fechaEntrega, input.cliente, input.sucursal, input.especie, input.cantidadAnimales, input.origen ?? 'punto_venta'],
  );
  const pedidoId = lastInsertId(db);

  for (const linea of input.lineas) {
    run(
      db,
      `INSERT INTO pedido_lineas (pedido_id, producto_id, cantidad, presentacion, especificacion)
       VALUES (?, ?, ?, ?, ?)`,
      [pedidoId, linea.productoId, linea.cantidad, linea.presentacion, linea.especificacion ?? null],
    );
  }

  for (const retoma of input.retomas) {
    run(db, `INSERT INTO pedido_retomas (pedido_id, producto_id, nota, cantidad) VALUES (?, ?, ?, ?)`, [
      pedidoId,
      retoma.productoId,
      retoma.nota ?? null,
      retoma.cantidad ?? null,
    ]);
  }

  persist();
  return pedidoId;
}

export async function listarPedidos(): Promise<PedidoResumen[]> {
  const db = await getDb();
  const rows = queryAll<{
    id: number;
    fecha_entrega: string;
    cliente: string;
    sucursal: string;
    especie: Especie;
    cantidad_animales: number;
    estado: string;
    origen: Origen;
    created_at: string;
  }>(db, `SELECT id, fecha_entrega, cliente, sucursal, especie, cantidad_animales, estado, origen, created_at FROM pedidos ORDER BY id DESC`);

  return rows.map((r) => ({
    id: r.id,
    fechaEntrega: r.fecha_entrega,
    cliente: r.cliente,
    sucursal: r.sucursal,
    especie: r.especie,
    cantidadAnimales: r.cantidad_animales,
    estado: r.estado,
    origen: r.origen,
    createdAt: r.created_at,
  }));
}

export async function obtenerPedido(id: number): Promise<Pedido | undefined> {
  const db = await getDb();
  const [cabecera] = queryAll<{
    id: number;
    fecha_entrega: string;
    cliente: string;
    sucursal: string;
    especie: Especie;
    cantidad_animales: number;
    estado: string;
    origen: Origen;
    created_at: string;
  }>(
    db,
    `SELECT id, fecha_entrega, cliente, sucursal, especie, cantidad_animales, estado, origen, created_at FROM pedidos WHERE id = ?`,
    [id],
  );
  if (!cabecera) return undefined;

  const lineasRows = queryAll<{
    id: number;
    producto_id: number;
    cantidad: number;
    presentacion: Presentacion;
    especificacion: string | null;
  }>(db, `SELECT id, producto_id, cantidad, presentacion, especificacion FROM pedido_lineas WHERE pedido_id = ?`, [id]);

  const retomasRows = queryAll<{ id: number; producto_id: number; nota: string | null; cantidad: number | null }>(
    db,
    `SELECT id, producto_id, nota, cantidad FROM pedido_retomas WHERE pedido_id = ?`,
    [id],
  );

  const lineas: PedidoLinea[] = lineasRows.map((l) => ({
    id: l.id,
    productoId: l.producto_id,
    cantidad: l.cantidad,
    presentacion: l.presentacion,
    especificacion: l.especificacion,
  }));

  const retomas: PedidoRetoma[] = retomasRows.map((r) => ({
    id: r.id,
    productoId: r.producto_id,
    nota: r.nota,
    cantidad: r.cantidad,
  }));

  return {
    id: cabecera.id,
    fechaEntrega: cabecera.fecha_entrega,
    cliente: cabecera.cliente,
    sucursal: cabecera.sucursal,
    especie: cabecera.especie,
    cantidadAnimales: cabecera.cantidad_animales,
    estado: cabecera.estado,
    origen: cabecera.origen,
    createdAt: cabecera.created_at,
    lineas,
    retomas,
  };
}
