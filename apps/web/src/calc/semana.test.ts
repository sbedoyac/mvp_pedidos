import { describe, expect, it } from 'vitest';
import { diasDeLaSemana, domingoDeLaSemana, lunesDeLaSemana } from './semana';

describe('lunesDeLaSemana', () => {
  it('un martes devuelve el lunes de esa misma semana', () => {
    expect(lunesDeLaSemana('2026-09-23')).toBe('2026-09-21'); // 2026-09-23 es martes
  });

  it('un lunes se devuelve a sí mismo', () => {
    expect(lunesDeLaSemana('2026-09-21')).toBe('2026-09-21');
  });

  it('un domingo pertenece a la semana que empezó el lunes anterior', () => {
    expect(lunesDeLaSemana('2026-09-27')).toBe('2026-09-21');
  });
});

describe('domingoDeLaSemana', () => {
  it('devuelve el domingo 6 días después del lunes', () => {
    expect(domingoDeLaSemana('2026-09-21')).toBe('2026-09-27');
  });
});

describe('diasDeLaSemana', () => {
  it('devuelve los 7 días de lunes a domingo en orden', () => {
    expect(diasDeLaSemana('2026-09-21')).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
  });
});
