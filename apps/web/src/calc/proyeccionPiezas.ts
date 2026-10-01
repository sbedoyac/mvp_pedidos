import { FAMILIAS_PIEZAS, FAMILIAS_PIEZAS_RES, type FamiliaPiezasConfig } from './familiasPiezas.config';

export type Especie = 'cerdo' | 'res';

export interface LineaPedido {
  productoId: number;
  cantidadPiezas: number;
}

export interface ProyeccionFamilia {
  clave: string;
  nombre: string;
  esperado: number;
  comprometido: number;
  disponible: number;
  sobrepasado: boolean;
}

function familiasDe(especie: Especie): FamiliaPiezasConfig[] {
  return especie === 'cerdo' ? FAMILIAS_PIEZAS : FAMILIAS_PIEZAS_RES;
}

/**
 * Proyecta cuánto de cada familia de piezas va comprometiendo un carrito de pedido, antes de
 * que ocurra el desposte (ver PLAN.md §2.1 — mismo dato de relaciones que
 * superops_jh/validacionPiezas.ts, sentido de cálculo invertido: acumulación, no comparación
 * contra un hecho consumado).
 *
 * Por cada línea del pedido, busca a qué familia(s) pertenece su productoId y suma
 * `cantidadPiezas × factor` al comprometido de esa familia. Un mismo productoId puede
 * pertenecer a varias familias a la vez (ver nota de "sexteado"/Chuleton en
 * familiasPiezas.config.ts) — en ese caso resta en todas simultáneamente, a propósito.
 */
export function proyeccionPiezas(
  cantidadAnimales: number,
  especie: Especie,
  lineas: LineaPedido[],
): ProyeccionFamilia[] {
  return familiasDe(especie).map((familia) => {
    const esperado = cantidadAnimales * familia.multiplicador;

    let comprometido = 0;
    for (const linea of lineas) {
      for (const producto of familia.productos) {
        if (producto.productoId === linea.productoId) {
          comprometido += linea.cantidadPiezas * (producto.factor ?? 1);
        }
      }
    }

    return {
      clave: familia.clave,
      nombre: familia.nombre,
      esperado,
      comprometido,
      disponible: esperado - comprometido,
      sobrepasado: comprometido > esperado,
    };
  });
}

/**
 * Cantidad máxima de `productoId` que se puede pedir sin dejar negativo el disponible de
 * NINGUNA familia a la que pertenezca (bloqueo duro, ver PLAN.md §1.3 — decisión revertida
 * 2026-09-22, antes era "se permite exceder, solo se alerta"; el usuario pidió bloqueo real
 * tras ver que dejaba escribir 40 Churrasco de cerdo con Lomo ya en negativo).
 *
 * Un producto puede pertenecer a varias familias a la vez (ej. Costi-chi → Barriguero Y
 * Costilla de cerdo) — el límite efectivo es el más restrictivo de todas. Las demás líneas ya
 * pedidas SÍ cuentan contra el disponible; la línea del propio `productoId` que se está
 * editando NO (se excluye de `lineas` antes de llamar, o se pasa su cantidad actual como 0 —
 * ver uso en usePedidoStore.setCantidadLinea).
 */
export function maxCantidadPermitida(
  cantidadAnimales: number,
  especie: Especie,
  productoId: number,
  otrasLineas: LineaPedido[],
): number {
  const familias = familiasDe(especie).filter((f) => f.productos.some((p) => p.productoId === productoId));
  if (familias.length === 0) return Infinity; // no pertenece a ninguna familia proyectada — sin límite

  let maximo = Infinity;
  for (const familia of familias) {
    const producto = familia.productos.find((p) => p.productoId === productoId)!;
    const factor = producto.factor ?? 1;

    const esperado = cantidadAnimales * familia.multiplicador;
    let comprometidoPorOtras = 0;
    for (const linea of otrasLineas) {
      for (const p of familia.productos) {
        if (p.productoId === linea.productoId) comprometidoPorOtras += linea.cantidadPiezas * (p.factor ?? 1);
      }
    }

    const disponibleParaEsteProducto = (esperado - comprometidoPorOtras) / factor;
    maximo = Math.min(maximo, Math.floor(disponibleParaEsteProducto));
  }

  return Math.max(0, maximo);
}
