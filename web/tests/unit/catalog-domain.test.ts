import { describe, expect, it } from 'vitest';
import { available, dropPhase, isPurchasable, stockLabel, type Drop } from '@/modules/catalog/domain';

const base: Drop = {
  id: 'd', slug: 'x', number: '01', name: 'X', copy: '', draft: false,
  announceAt: '2026-11-01T00:00:00Z', keyOpensAt: '2026-11-10T00:00:00Z',
  opensAt: '2026-11-12T00:00:00Z', archivedAt: '2027-01-01T00:00:00Z',
};
const at = (iso: string) => new Date(iso);

describe('dropPhase', () => {
  it('un borrador nunca se ve', () => {
    expect(dropPhase({ ...base, draft: true }, at('2026-11-20T00:00:00Z'), false)).toBe('borrador');
  });
  it('antes del anuncio sigue oculto', () => {
    expect(dropPhase(base, at('2026-10-01T00:00:00Z'), false)).toBe('borrador');
  });
  it('anunciado entre el anuncio y la llave', () => {
    expect(dropPhase(base, at('2026-11-05T00:00:00Z'), false)).toBe('anunciado');
  });
  it('con llave antes de abrir', () => {
    expect(dropPhase(base, at('2026-11-11T00:00:00Z'), false)).toBe('llave');
  });
  it('abierto desde opensAt', () => {
    expect(dropPhase(base, at('2026-11-12T00:00:00Z'), false)).toBe('abierto');
  });
  it('agotado si está abierto y sin stock', () => {
    expect(dropPhase(base, at('2026-11-13T00:00:00Z'), true)).toBe('agotado');
  });
  it('archivo desde archivedAt', () => {
    expect(dropPhase(base, at('2027-02-01T00:00:00Z'), false)).toBe('archivo');
  });
  it('sin fecha de llave pasa de anunciado a abierto', () => {
    expect(dropPhase({ ...base, keyOpensAt: null }, at('2026-11-11T00:00:00Z'), false)).toBe('anunciado');
  });
});

describe('stock', () => {
  it('disponible = stock menos reservas, nunca negativo', () => {
    expect(available(5, 2)).toBe(3);
    expect(available(1, 3)).toBe(0);
  });
  it('etiqueta de stock', () => {
    expect(stockLabel(0)).toBe('AGOTADO');
    expect(stockLabel(2)).toBe('SOLO QUEDAN 2');
    expect(stockLabel(9)).toBe('EN STOCK');
  });
  it('solo se compra en fase abierto', () => {
    expect(isPurchasable('abierto')).toBe(true);
    expect(isPurchasable('llave')).toBe(false);
    expect(isPurchasable('agotado')).toBe(false);
  });
});
