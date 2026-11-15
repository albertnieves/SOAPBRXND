import { describe, expect, it } from 'vitest';
import { formatEuros, grossToNet, parseEuros } from '@/lib/money';

describe('money (céntimos enteros)', () => {
  it('formatea importes redondos sin decimales', () => {
    expect(formatEuros(6500)).toBe('65 €');
  });
  it('formatea céntimos con coma', () => {
    expect(formatEuros(4990)).toBe('49,90 €');
  });
  it('lee importes escritos a mano', () => {
    expect(parseEuros('29,95')).toBe(2995);
    expect(parseEuros('17 €')).toBe(1700);
    expect(parseEuros('abc')).toBeNull();
  });
  it('quita el IVA con redondeo exacto', () => {
    expect(grossToNet(12100, 2100)).toBe(10000);
  });
});
