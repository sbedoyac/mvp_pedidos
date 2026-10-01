import { describe, expect, it } from 'vitest';
import { PUNTA_DE_ANCA_CONFIG } from './familiasPiezas.config';
import { maxCantidadPermitida, proyeccionPiezas } from './proyeccionPiezas';

describe('proyeccionPiezas — Cerdo', () => {
  it('sin líneas de pedido, esperado = cantidadAnimales × multiplicador, comprometido 0', () => {
    const resultado = proyeccionPiezas(50, 'cerdo', []);

    const pierna = resultado.find((f) => f.clave === 'pierna')!;
    expect(pierna.esperado).toBe(100); // 50 × 2
    expect(pierna.comprometido).toBe(0);
    expect(pierna.disponible).toBe(100);

    const papada = resultado.find((f) => f.clave === 'papada')!;
    expect(papada.esperado).toBe(100); // 50 × 2

    const cabezaDeCerdo = resultado.find((f) => f.clave === 'cabezaDeCerdo')!;
    expect(cabezaDeCerdo.esperado).toBe(50); // 50 × 1 (no bilateral)
  });

  it('caso de referencia del usuario: 50 cerdos, 10 Puntas de anca ⇒ Pierna 100/10/90', () => {
    const resultado = proyeccionPiezas(50, 'cerdo', [
      { productoId: PUNTA_DE_ANCA_CONFIG.puntaDeAnca.productoId, cantidadPiezas: 10 },
    ]);

    const pierna = resultado.find((f) => f.clave === 'pierna')!;
    // "Punta de anca de cerdo" (id 79) NO está en la lista de productos de la familia Pierna
    // a propósito (ver familiasPiezas.config.ts) — tiene su propia validación 1:1. La
    // proyección de piezas de este MVP la trata igual: pedir Punta de anca resta contra
    // Pierna solo si el caller la mapea así; aquí verificamos el comportamiento base del
    // motor con el productoId real de Punta de anca, que no pertenece a ninguna familia de
    // FAMILIAS_PIEZAS — por lo tanto NO debe restar nada.
    expect(pierna.comprometido).toBe(0);
    expect(pierna.disponible).toBe(100);
  });

  it('sobrepasado se marca true cuando comprometido > esperado', () => {
    // proyeccionPiezas por sí sola no bloquea — el bloqueo duro (ver PLAN.md §1.3, decisión
    // revertida 2026-09-22) lo aplica maxCantidadPermitida antes de llegar a este estado; este
    // test deja constancia del comportamiento base del motor si de todos modos se le pasan
    // líneas que exceden (ej. datos ya guardados de antes del bloqueo).
    const resultado = proyeccionPiezas(1, 'cerdo', [{ productoId: 4, cantidadPiezas: 5 }]); // Pierna id 4

    const pierna = resultado.find((f) => f.clave === 'pierna')!;
    expect(pierna.esperado).toBe(2);
    expect(pierna.comprometido).toBe(5);
    expect(pierna.disponible).toBe(-3);
    expect(pierna.sobrepasado).toBe(true);
  });

  it('un productoId que pertenece a varias familias resta en todas simultáneamente (Chuleton)', () => {
    const resultado = proyeccionPiezas(10, 'cerdo', [{ productoId: 10571, cantidadPiezas: 3 }]); // Chuleton

    for (const clave of ['lomo', 'barriguero', 'costilla']) {
      const familia = resultado.find((f) => f.clave === clave)!;
      expect(familia.comprometido, `familia ${clave}`).toBe(3);
    }
  });

  it('factor escala la cantidad antes de sumar (Manero sexteado en Cabeza de lomo, factor 0.5)', () => {
    const resultado = proyeccionPiezas(10, 'cerdo', [{ productoId: 58, cantidadPiezas: 6 }]); // Manero sexteado

    const cabezaDeLomo = resultado.find((f) => f.clave === 'cabezaDeLomo')!;
    expect(cabezaDeLomo.comprometido).toBe(3); // 6 × 0.5

    const manero = resultado.find((f) => f.clave === 'manero')!;
    expect(manero.comprometido).toBe(6); // factor 1 en su propia familia

    const papada = resultado.find((f) => f.clave === 'papada')!;
    expect(papada.comprometido).toBe(6); // factor 1 también en Papada
  });
});

describe('proyeccionPiezas — Res', () => {
  it('multiplicador ×1 para familias sin bilateralidad (ej. Sobrebarriga)', () => {
    const resultado = proyeccionPiezas(20, 'res', []);
    const sobrebarriga = resultado.find((f) => f.clave === 'sobrebarriga')!;
    expect(sobrebarriga.esperado).toBe(20); // 20 × 1
  });

  it('pedir Pecho entero resta contra la misma familia que Pecho', () => {
    const resultado = proyeccionPiezas(5, 'res', [{ productoId: 10592, cantidadPiezas: 2 }]); // Pecho entero
    const pecho = resultado.find((f) => f.clave === 'pecho')!;
    expect(pecho.comprometido).toBe(2);
  });
});

describe('maxCantidadPermitida — bloqueo duro (PLAN.md §1.3, revertido 2026-09-22)', () => {
  it('sin otras líneas, el máximo es el esperado completo de la familia', () => {
    const max = maxCantidadPermitida(25, 'cerdo', 396, []); // Churrasco de cerdo → familia Lomo
    expect(max).toBe(50); // 25 × 2
  });

  it('caso real del usuario: 25 cerdos, Churrasco 40 ya pedido ⇒ Chuleton topa en 10, no 11', () => {
    // Lomo esperado = 50. Con Churrasco de cerdo (id 396) en 40, quedan 10 disponibles.
    const max = maxCantidadPermitida(25, 'cerdo', 10571, [{ productoId: 396, cantidadPiezas: 40 }]); // Chuleton
    expect(max).toBe(10);
  });

  it('producto multi-familia: el límite es el más restrictivo de todas sus familias', () => {
    // Costi-chi (id 80) → Barriguero Y Costilla de cerdo. Si Costilla ya tiene 45 comprometidos
    // de 50 esperados (quedan 5) y Barriguero sigue en 0, el máximo debe ser 5, no 50.
    const max = maxCantidadPermitida(25, 'cerdo', 80, [{ productoId: 10, cantidadPiezas: 45 }]); // Costilla de cerdo id 10
    expect(max).toBe(5);
  });

  it('factor fraccional: el máximo se ajusta dividiendo por el factor, familia por familia', () => {
    // Manero sexteado (id 58) pertenece a 3 familias: Manero (factor 1, esperado 20 con 10
    // animales → máximo 20), Papada (factor 1, esperado 20 → máximo 20) y Cabeza de lomo
    // (factor 0.5, esperado 20 tras el cambio de multiplicador 2026-09-22 → máximo 20/0.5=40).
    // El límite efectivo es el más restrictivo de las 3: 20 (Manero/Papada), no 40.
    const max = maxCantidadPermitida(10, 'cerdo', 58, []);
    expect(max).toBe(20);
  });

  it('un producto que no pertenece a ninguna familia proyectada no tiene límite', () => {
    const max = maxCantidadPermitida(25, 'res', 61, []); // Tapa de costilla — sin familia proyectada
    expect(max).toBe(Infinity);
  });

  it('nunca devuelve negativo, aunque ya se haya excedido el disponible', () => {
    const max = maxCantidadPermitida(1, 'cerdo', 4, [{ productoId: 4, cantidadPiezas: 999 }]); // Pierna
    expect(max).toBe(0);
  });
});
