import { describe, expect, it } from 'vitest';
import { FAMILIAS_PIEZAS, FAMILIAS_PIEZAS_RES } from './familiasPiezas.config';

describe.each([
  ['Cerdo', FAMILIAS_PIEZAS],
  ['Res', FAMILIAS_PIEZAS_RES],
] as const)('%s', (_label, familias) => {
  it('cada familia tiene al menos 1 producto', () => {
    for (const familia of familias) {
      expect(familia.productos.length, `familia ${familia.clave} sin productos`).toBeGreaterThan(0);
    }
  });

  it('ningún productoId se repite dentro de la misma familia', () => {
    for (const familia of familias) {
      const ids = familia.productos.map((p) => p.productoId);
      expect(new Set(ids).size, `familia ${familia.clave} tiene productoId duplicado`).toBe(ids.length);
    }
  });
});
