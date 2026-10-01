import type { Especie } from '../calc/proyeccionPiezas';

export type Presentacion = 'vacio' | 'granel';
/** punto_venta = pedido normal de un Tercero/Sucursal; planta = reserva de excedente semanal sin cliente (ver CLAUDE.md §6.14). */
export type Origen = 'punto_venta' | 'planta';

export interface ClienteDTO {
  terceroId: number;
  terceroNombre: string;
  sucursalId: number;
  sucursalNombre: string;
}

export interface PedidoLineaInput {
  productoId: number;
  cantidad: number;
  presentacion: Presentacion;
  especificacion?: string | null;
}

export interface PedidoRetomaInput {
  productoId: number;
  nota?: string | null;
  /** Piezas retomadas, solo para productos con conteo de piezas conocido (ver CLAUDE.md §6.13). null/undefined = se retoma el lote completo, sin cantidad. */
  cantidad?: number | null;
}

export interface PedidoInput {
  fechaEntrega: string;
  cliente: string;
  sucursal: string;
  especie: Especie;
  cantidadAnimales: number;
  lineas: PedidoLineaInput[];
  retomas: PedidoRetomaInput[];
  /** default 'punto_venta' si se omite. */
  origen?: Origen;
}

export interface PedidoResumenDTO {
  id: number;
  fechaEntrega: string;
  cliente: string;
  sucursal: string;
  especie: Especie;
  cantidadAnimales: number;
  estado: string;
  origen: Origen;
  createdAt: string;
}
