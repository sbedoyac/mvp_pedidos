import { describe, expect, it } from 'vitest';
import { catalogoCortes, corteDelPadre } from './catalogoCortes';

describe('catalogoCortes', () => {
  it('cada productoId aparece una sola vez, incluso si pertenece a varias familias (Cerdo)', () => {
    const cortes = catalogoCortes('cerdo');
    const ids = cortes.map((c) => c.productoId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Punta de anca de cerdo aparece en la grilla, agrupada bajo Pierna', () => {
    const cortes = catalogoCortes('cerdo');
    const puntaDeAnca = cortes.find((c) => c.productoId === 79);
    expect(puntaDeAnca).toBeDefined();
    expect(puntaDeAnca?.familiaClave).toBe('pierna');
  });

  it('Res: Solomito trae sus especificaciones de presentación', () => {
    const cortes = catalogoCortes('res');
    const solomito = cortes.find((c) => c.productoId === 24);
    expect(solomito?.especificaciones).toEqual(['Sin cordón', 'T-bone']);
  });

  it('Res: Tapa de costilla aparece sin familia proyectada (no está en FAMILIAS_PIEZAS_RES)', () => {
    const cortes = catalogoCortes('res');
    const tapaDeCostilla = cortes.find((c) => c.productoId === 61);
    expect(tapaDeCostilla?.familiaClave).toBe('');
  });

  it('Cabeza de cerdo no aparece en la grilla (el administrador nunca la pide directamente)', () => {
    const cortes = catalogoCortes('cerdo');
    const cabezaDeCerdo = cortes.find((c) => c.familiaClave === 'cabezaDeCerdo');
    expect(cabezaDeCerdo).toBeUndefined();
  });

  it('el corte padre (Barriguero id 7) no aparece como tarjeta pedible — solo sus derivados', () => {
    const cortes = catalogoCortes('cerdo');
    const barriguero = cortes.find((c) => c.productoId === 7);
    expect(barriguero).toBeUndefined();
    const costiChi = cortes.find((c) => c.productoId === 80); // Costi-chi, derivado de Barriguero
    expect(costiChi).toBeDefined();
  });

  it('Res: familias de un solo producto sí se ofrecen (no hay "padre" que derivar)', () => {
    const cortes = catalogoCortes('res');
    const solomito = cortes.find((c) => c.productoId === 24);
    expect(solomito).toBeDefined();
  });
});

describe('corteDelPadre', () => {
  it('devuelve el productoId + nombre del corte padre de una familia (Barriguero id 7)', () => {
    expect(corteDelPadre('barriguero', 'cerdo')).toEqual({ productoId: 7, nombre: 'Barriguero' });
  });

  it('funciona igual para una familia de un solo producto (Res)', () => {
    expect(corteDelPadre('solomito', 'res')).toEqual({ productoId: 24, nombre: 'Solomito' });
  });

  it('devuelve undefined para una clave de familia que no existe', () => {
    expect(corteDelPadre('no-existe', 'cerdo')).toBeUndefined();
  });
});
