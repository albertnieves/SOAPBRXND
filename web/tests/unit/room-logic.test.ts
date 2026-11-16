import { describe, expect, it } from 'vitest';
import { bagCount, danielReply, daylight, euro, findPath, isMoveKey, itemIn, keyStep, nearestFree, sizeForHeight, washerStatus } from '@/room/logic';
import { CatalogView } from '@/modules/catalog/view';
import { seedData } from '@/modules/catalog/seed-source';
import { roomData } from '@/modules/catalog/room';

const data = roomData(new CatalogView(seedData(), new Date('2026-11-15T12:00:00Z')));
const open = (x: number, y: number) => x >= 0 && y >= 0 && x < 6 && y < 6;
const wall = (x: number, y: number) => open(x, y) && !(x === 2 && y < 5);

describe('caminar por la sala', () => {
  it('encuentra el camino más corto y rodea los muebles', () => {
    expect(findPath(0, 0, 3, 0, open)).toHaveLength(3);
    const p = findPath(0, 0, 4, 0, wall)!;
    expect(p[p.length - 1]).toEqual([4.5, 0.5]); // centros de baldosa
    expect(p.every(([x, y]) => wall(Math.floor(x), Math.floor(y)))).toBe(true);
    expect(p.some(([, y]) => Math.floor(y) === 5)).toBe(true);
  });
  it('sin camino devuelve null; sin moverse, camino vacío', () => {
    expect(findPath(0, 0, 4, 0, (x, y) => open(x, y) && x !== 2)).toBeNull();
    expect(findPath(1, 1, 1, 1, open)).toEqual([]);
  });
  it('no corta esquinas en diagonal', () => {
    const free = (x: number, y: number) => open(x, y) && !(x === 1 && y === 0);
    const p = findPath(0, 0, 1, 1, free)!;
    expect(p).toEqual([[0.5, 1.5], [1.5, 1.5]]);
  });
  it('busca la baldosa libre más cercana a un mueble', () => {
    expect(nearestFree(2, 0, wall)).not.toBeNull();
    expect(nearestFree(3, 3, open)).toEqual([3, 3]);
    expect(nearestFree(40, 40, open)).toBeNull();
  });
});

describe('teclado', () => {
  it('reconoce flechas y WASD', () => {
    expect(['ArrowUp', 'w', 'A', 's', 'd'].every(isMoveKey)).toBe(true);
    expect(isMoveKey('e')).toBe(false);
  });
  it('arriba es hacia el fondo y se desliza si la diagonal está tapada', () => {
    expect(keyStep(['ArrowUp'], 3, 3, open)).toEqual([2, 2]);
    expect(keyStep(['ArrowUp'], 0, 3, open)).toEqual([0, 2]);
    expect(keyStep(['ArrowUp'], 0, 0, open)).toBeNull();
    expect(keyStep(['ArrowUp', 'ArrowDown'], 3, 3, open)).toBeNull();
  });
});

describe('bolsa y formato', () => {
  it('cuenta las unidades de la cookie', () => {
    expect(bagCount('a=1; sbx_bolsa=50000000-0000-4000-8000-000000000006:2.50000000-0000-4000-8000-000000000007:1')).toBe(3);
    expect(bagCount('otra=1')).toBe(0);
    expect(bagCount('sbx_bolsa=x:99')).toBe(10);
  });
  it('precios en euros', () => {
    expect(euro(3500).replace(/\s/g, ' ')).toBe('35 €');
    expect(euro(490).replace(/\s/g, ' ')).toBe('4,90 €');
  });
  it('luz según la hora', () => {
    expect([daylight(12), daylight(19), daylight(23), daylight(3)]).toEqual(['dia', 'tarde', 'noche', 'noche']);
  });
  it('estado de cada lavadora', () => {
    expect(data.washers.map(washerStatus)).toEqual(['available', 'coming', 'locked']);
  });
});

describe('Daniel', () => {
  it('da talla por altura', () => {
    expect([sizeForHeight(160), sizeForHeight(175), sizeForHeight(185), sizeForHeight(195)]).toEqual(['S', 'M', 'L', 'XL']);
    expect(danielReply('mido 1,75', data).text).toContain('la M');
    expect(danielReply('mido 190 cm', data).text).toContain('la XL');
    expect(danielReply('¿qué talla cojo?', data).text).toContain('boxy');
  });
  it('reconoce la pieza de la que se habla', () => {
    expect(itemIn('quiero la camiseta pompa', data.items)?.slug).toBe('tee-pompa-repeat');
    expect(itemIn('hola', data.items)).toBeNull();
  });
  it('recomienda algo que se puede comprar y lo enseña', () => {
    const r = danielReply('¿qué me recomiendas?', data, () => 0);
    expect(r.show).toBeTruthy();
    expect(data.items.find((i) => i.slug === r.show)!.purchasable).toBe(true);
  });
  it('responde de stock, envíos y devoluciones', () => {
    const r = danielReply('¿queda stock de la tee pompa?', data);
    expect(r.show).toBe('tee-pompa-repeat');
    expect(danielReply('¿cuánto tarda el envío?', data).text).toContain('48');
    expect(danielReply('quiero devolver', data).text).toContain('14 días');
  });
  it('siempre contesta algo', () => {
    expect(danielReply('asdfgh', data).text.length).toBeGreaterThan(5);
  });
});
