import { ESPECIFICACIONES_RES } from './especificaciones.config';
import { FAMILIAS_PIEZAS, FAMILIAS_PIEZAS_RES, PUNTA_DE_ANCA_CONFIG, type FamiliaPiezasConfig } from './familiasPiezas.config';
import type { Especie } from './proyeccionPiezas';

export interface CorteCatalogo {
  productoId: number;
  nombre: string;
  familiaClave: string;
  familiaNombre: string;
  especificaciones: string[];
  /**
   * true si este productoId es el "corte padre" genérico de su familia — el primer producto
   * listado en FamiliaPiezasConfig.productos, que da nombre a la familia (ej. "Barriguero" id
   * 7 en la familia 'barriguero'), y esa familia tiene además otros productos derivados. No
   * se pide a mano (ver PLAN.md/CLAUDE.md 2026-09-22): su cantidad es siempre esperado −
   * comprometido de los demás productos de la familia — el punto de venta recibe por defecto
   * el corte sin transformar, y cada corte derivado que el administrador pide (ej. Costi-chi)
   * le resta a ese default. Familias de un solo producto (todo Res, y algunas de Cerdo como
   * "Cabeza de cerdo") no tienen `esPadre: true` — ahí el único producto SÍ se pide a mano,
   * no hay nada que derivar.
   */
  esPadre: boolean;
  /** Aviso corto a mostrar en la tarjeta cuando el corte tiene cantidad pedida > 0 (ver Punta de anca de cerdo). */
  nota?: string;
}

function familiasDe(especie: Especie): FamiliaPiezasConfig[] {
  return especie === 'cerdo' ? FAMILIAS_PIEZAS : FAMILIAS_PIEZAS_RES;
}

/**
 * Deriva la grilla de tarjetas de producto (Fase 3.11) a partir de la config de familias ya
 * verificada — cada productoId aparece UNA sola vez en la grilla aunque pertenezca a varias
 * familias a la vez (ej. Chuleton en Lomo/Barriguero/Costilla), mostrando la primera familia
 * en la que aparece como "familia principal" solo para agrupar visualmente la grilla.
 */
export function catalogoCortes(especie: Especie): CorteCatalogo[] {
  const vistos = new Map<number, CorteCatalogo>();

  for (const familia of familiasDe(especie)) {
    familia.productos.forEach((producto, indice) => {
      if (vistos.has(producto.productoId)) return;
      vistos.set(producto.productoId, {
        productoId: producto.productoId,
        nombre: producto.nombre,
        familiaClave: familia.clave,
        familiaNombre: familia.nombre,
        especificaciones: [],
        esPadre: indice === 0 && familia.productos.length > 1,
      });
    });
  }

  if (especie === 'cerdo') {
    // Punta de anca de cerdo no pertenece a FAMILIAS_PIEZAS a propósito (ver
    // familiasPiezas.config.ts) — se ofrece igual como tarjeta, agrupada bajo Pierna.
    const { puntaDeAnca } = PUNTA_DE_ANCA_CONFIG;
    if (!vistos.has(puntaDeAnca.productoId)) {
      vistos.set(puntaDeAnca.productoId, {
        productoId: puntaDeAnca.productoId,
        nombre: puntaDeAnca.nombre,
        familiaClave: 'pierna',
        familiaNombre: 'Pierna',
        especificaciones: [],
        esPadre: false,
        // A pedido del usuario (2026-09-23): el rendimiento de este corte depende del
        // porcentaje de grasa de los cerdos, algo que la app no puede proyectar — se avisa al
        // administrador cuando pide cantidad > 0 (ver CatalogoCortesGrid.tsx).
        nota: 'Recuerda que este tipo de corte depende el porcentaje de grasa de tus cerdos',
      });
    }
  }

  if (especie === 'res') {
    for (const entrada of ESPECIFICACIONES_RES) {
      const existente = vistos.get(entrada.productoId);
      if (existente) {
        existente.especificaciones = entrada.especificaciones;
      } else {
        // Cortes con especificación pero sin patrón fijo de piezas/canal (ej. Tapa de
        // costilla) — no están en FAMILIAS_PIEZAS_RES, se agregan igual como tarjeta sin
        // familia asociada (no restan contra ningún disponible proyectado).
        vistos.set(entrada.productoId, {
          productoId: entrada.productoId,
          nombre: entrada.nombre,
          familiaClave: '',
          familiaNombre: 'Sin familia proyectada',
          especificaciones: entrada.especificaciones,
          esPadre: false,
        });
      }
    }
  }

  // "Cabeza de cerdo" no se ofrece como tarjeta de pedido (2026-09-22, a pedido del usuario)
  // — el administrador nunca la pide directamente. Sigue existiendo en
  // FAMILIAS_PIEZAS/familiasPiezas.config.ts (no se toca esa copia fiel de superops_jh), solo
  // se excluye de la grilla visual. Los cortes padre (esPadre: true) tampoco se ofrecen como
  // tarjeta pedible — ver nota de CorteCatalogo.esPadre; se muestran aparte como indicador de
  // disponible en el header de la sección (CatalogoCortesGrid.tsx), no como tarjeta con stepper.
  return [...vistos.values()]
    .filter((c) => c.familiaClave !== 'cabezaDeCerdo' && !c.esPadre)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * productoId + nombre del "corte padre" genérico de una familia — el primer producto de
 * `FamiliaPiezasConfig.productos` (mismo criterio que `esPadre` arriba, sin exigir que la
 * familia tenga más de un producto). Usado para generar automáticamente una línea de pedido
 * "sin transformar" (ver CLAUDE.md §6.9 — caso real: pedido de puro corte genérico, sin
 * ningún corte especial, que antes no dejaba avanzar por tener 0 líneas en el carrito).
 */
export function corteDelPadre(familiaClave: string, especie: Especie): { productoId: number; nombre: string } | undefined {
  const familia = familiasDe(especie).find((f) => f.clave === familiaClave);
  const primero = familia?.productos[0];
  return primero && { productoId: primero.productoId, nombre: primero.nombre };
}

/**
 * Todos los cortes padre de una especie (uno por familia con más de un producto — mismo
 * criterio que `esPadre`), para ofrecerlos en Retoma (ver CLAUDE.md §6.12): aunque el padre
 * nunca se PIDE a mano (se recibe por defecto, ver §6.4), el punto de venta sí puede tener
 * exceso del corte genérico sin transformar y el administrador necesita poder marcarlo.
 */
export function cortesPadre(especie: Especie): { productoId: number; nombre: string }[] {
  return familiasDe(especie)
    .filter((f) => f.productos.length > 1)
    .map((f) => ({ productoId: f.productos[0].productoId, nombre: f.productos[0].nombre }));
}
