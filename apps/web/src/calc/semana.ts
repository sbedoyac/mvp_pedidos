/**
 * Semana calendario lunes-domingo (ver CLAUDE.md §6.14) — usada para agrupar pedidos en la
 * vista de Programación semanal y calcular el excedente contra CAPACIDAD_SEMANAL_CERDOS.
 */

/** Cerdos fijos disponibles para desposte por semana — constante de negocio, confirmada por el usuario (2026-09-23), no viene de sgc ni es configurable en la UI todavía. */
export const CAPACIDAD_SEMANAL_CERDOS = 3240;

/** Lunes (00:00) de la semana ISO que contiene `fechaISO` ("YYYY-MM-DD"), como string ISO. */
export function lunesDeLaSemana(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  const diaSemana = fecha.getUTCDay(); // 0=domingo .. 6=sábado
  const offsetHastaLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  fecha.setUTCDate(fecha.getUTCDate() + offsetHastaLunes);
  return fecha.toISOString().slice(0, 10);
}

/** Domingo (fin) de la semana que empieza en `lunesISO`. */
export function domingoDeLaSemana(lunesISO: string): string {
  const [y, m, d] = lunesISO.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  fecha.setUTCDate(fecha.getUTCDate() + 6);
  return fecha.toISOString().slice(0, 10);
}

/** Los 7 días ISO (lunes a domingo) de la semana que empieza en `lunesISO`, en orden. */
export function diasDeLaSemana(lunesISO: string): string[] {
  const [y, m, d] = lunesISO.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date(Date.UTC(y, m - 1, d));
    fecha.setUTCDate(fecha.getUTCDate() + i);
    return fecha.toISOString().slice(0, 10);
  });
}
