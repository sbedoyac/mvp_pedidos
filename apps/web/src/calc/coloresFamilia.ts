/**
 * Paleta de acento por familia — puramente visual (UX 2026-09-22, a pedido del usuario: "que
 * sepa exactamente lo que le va a llegar de una manera ordenada"), rota en orden fijo para
 * que cada sección del catálogo sea reconocible de un vistazo. No tiene relación con datos de
 * negocio.
 */
const PALETA = [
  { fondo: '#fdeeea', acento: '#e0603f', acentoOscuro: '#b5472b' }, // terracota
  { fondo: '#eaf4ec', acento: '#3f9a5c', acentoOscuro: '#2c7444' }, // verde
  { fondo: '#eef1fb', acento: '#5468d4', acentoOscuro: '#3d4ea8' }, // azul
  { fondo: '#fdf3e3', acento: '#d99a2b', acentoOscuro: '#a8741a' }, // mostaza
  { fondo: '#f7ecf7', acento: '#a458a0', acentoOscuro: '#7d3f77' }, // ciruela
  { fondo: '#e6f5f5', acento: '#2b9a9a', acentoOscuro: '#1f7373' }, // teal
] as const;

export interface AcentoFamilia {
  fondo: string;
  acento: string;
  acentoOscuro: string;
}

const cache = new Map<string, AcentoFamilia>();
let siguiente = 0;

/** Asigna (y recuerda) un color de acento estable por clave de familia. */
export function colorDeFamilia(familiaClave: string): AcentoFamilia {
  const clave = familiaClave || '__sin-familia__';
  const existente = cache.get(clave);
  if (existente) return existente;

  const color = PALETA[siguiente % PALETA.length];
  siguiente += 1;
  cache.set(clave, color);
  return color;
}
