/**
 * Catálogo de productos retomables SIN proyección de piezas — agregado 2026-09-22 tras
 * revisar `SCSJ_REGISTRO_ANUAL_CERDO_2026 - MAQUILAS.pdf` (registro real de pedidos, ver
 * CLAUDE.md §6.7). Estos productos NUNCA se piden como línea de pedido (no tienen
 * multiplicador confiable — ver superops_jh/CLAUDE.md §6.20, "van a comparación contra
 * promedio histórico, no a una regla fija que sería falsa") — solo se marcan en Retoma cuando
 * el punto de venta ya tiene exceso y no se le debe despachar más.
 *
 * `producto_id` verificado 2026-09-22 contra el catálogo real con movimiento
 * (`web_apps/tabla_especificaciones/productos_despachados.json`). "Vísceras", "Pedacitos",
 * "Desgorde", "Tocino grasa", "Garra", "Hueso", "Cadero" y "Empella" son exactamente los
 * productos que se repiten en el documento junto a "RETOMAR" (>15 menciones combinadas).
 */

export interface ProductoRetomaExtendida {
  productoId: number;
  nombre: string;
}

export const RETOMA_EXTENDIDA_CERDO: ProductoRetomaExtendida[] = [
  { productoId: 19, nombre: 'Viscera de cerdo' },
  { productoId: 21, nombre: 'Pedacitos de cerdo' },
  { productoId: 20, nombre: 'Desgorde cerdo' },
  { productoId: 9, nombre: 'Tocino grasa' },
  { productoId: 14, nombre: 'Garra' },
  { productoId: 18, nombre: 'Hueso blanco de cerdo' },
  { productoId: 15, nombre: 'Cadero' },
  { productoId: 16, nombre: 'Empella' },
];
