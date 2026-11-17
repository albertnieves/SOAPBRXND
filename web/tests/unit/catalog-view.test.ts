import { describe, expect, it } from 'vitest';
import { CatalogView } from '@/modules/catalog/view';
import { seedData } from '@/modules/catalog/seed-source';
import { roomData } from '@/modules/catalog/room';

const NOW = new Date('2026-11-15T12:00:00Z');
const view = () => new CatalogView(seedData(), NOW);

describe('CatalogView', () => {
  it('fases de los drops de la semilla', () => {
    const v = view();
    expect(v.phaseOf(v.dropBySlug('first-signal')!)).toBe('abierto');
    expect(v.phaseOf(v.dropBySlug('visual-pack-001')!)).toBe('anunciado');
    expect(v.phaseOf(v.dropBySlug('locked-drop')!)).toBe('llave');
  });
  it('los borradores no existen para la tienda', () => {
    const v = view();
    expect(v.dropBySlug('next-chapter')).toBeNull();
    expect(v.visibleDrops().map((d) => d.number)).toEqual(['01', '02', '03']);
  });
  it('encuentra producto, arte, soporte y variantes', () => {
    const v = view();
    const p = v.productBySlug('tee-pompa-repeat')!;
    expect(v.artwork(p.artworkId).slug).toBe('pompa-repeat');
    expect(v.support(p.supportId).slug).toBe('tee');
    expect(v.variantsOf(p.id).map((x) => x.options.talla)).toEqual(['S', 'M', 'L', 'XL']);
    expect(v.productsOfArtwork(v.artworkBySlug('ajedrez-lavanderia')!.id).map((x) => x.slug)).toEqual([
      'hoodie-ajedrez-lavanderia', 'panuelo-ajedrez-lavanderia',
    ]);
  });
  it('un producto se compra solo si su drop está abierto y queda stock', () => {
    const v = view();
    expect(v.purchasable(v.productBySlug('tee-pompa-repeat')!)).toBe(true);
    expect(v.purchasable(v.productBySlug('panuelo-ajedrez-lavanderia')!)).toBe(false); // sin stock
    expect(v.purchasable(v.productBySlug('lamina-sabana-tendida')!)).toBe(false); // drop anunciado
  });
  it('un drop abierto sin stock está agotado', () => {
    const data = seedData();
    data.variants = data.variants.map((x) => ({ ...x, available: 0 }));
    const v = new CatalogView(data, NOW);
    expect(v.phaseOf(v.dropBySlug('first-signal')!)).toBe('agotado');
  });
});

describe('fotos', () => {
  it('las fotos de un producto salen en orden; sin fotos, lista vacía', () => {
    const data = seedData();
    const p = data.products[0]!;
    p.images = [{ url: 'https://x/b.jpg', alt: 'b', position: 2 }, { url: 'https://x/a.jpg', alt: 'a', position: 1 }];
    const v = new CatalogView(data, NOW);
    expect(v.imagesOf(v.productBySlug(p.slug)!).map((i) => i.alt)).toEqual(['a', 'b']);
    expect(v.imagesOf(v.productBySlug('tee-pompa-repeat')!)).toEqual([]);
  });
});

describe('catálogo incompleto', () => {
  it('un producto sin variantes no se enseña', () => {
    const data = seedData();
    data.variants = data.variants.filter((v) => v.productId !== data.products[0]!.id);
    const v = new CatalogView(data, NOW);
    expect(v.productBySlug(data.products[0]!.slug)).toBeNull();
  });
  it('un arte sin productos visibles no se enseña', () => {
    const data = seedData();
    data.products = data.products.filter((p) => p.slug !== 'gorro-espuma');
    const v = new CatalogView(data, NOW);
    expect(v.artworkBySlug('espuma')).toBeNull();
    expect(v.artworks().map((a) => a.slug)).not.toContain('espuma');
  });
});

describe('roomData', () => {
  it('como mucho cuatro lavadoras, por número y sin borradores', () => {
    const r = roomData(view());
    expect(r.washers.map((w) => [w.number, w.phase])).toEqual([['01', 'abierto'], ['02', 'anunciado'], ['03', 'llave']]);
    expect(r.washers[0]!.href).toBe('/drops/first-signal');
  });
  it('el perchero lleva las prendas de drops visibles con enlace a su ficha', () => {
    const r = roomData(view());
    const tee = r.items.find((i) => i.slug === 'tee-pompa-repeat')!;
    expect(tee).toMatchObject({ href: '/p/tee-pompa-repeat', priceCents: 3500, sprite: 'tee', purchasable: true });
    expect(r.items.find((i) => i.slug === 'panuelo-ajedrez-lavanderia')!.stockLabel).toBe('AGOTADO');
  });
  it('cada pieza trae sus variantes y su arte para la ficha rápida de la sala', () => {
    const r = roomData(view());
    const tee = r.items.find((i) => i.slug === 'tee-pompa-repeat')!;
    expect(tee.variants.map((v) => v.label)).toEqual(['S', 'M', 'L', 'XL']);
    expect(tee).toMatchObject({ artSlug: 'pompa-repeat', phase: 'abierto' });
    expect(r.washers[0]!.copy.length).toBeGreaterThan(0);
    expect(r.artworks[0]!.story.length).toBeGreaterThan(0);
  });
  it('la pared de artes enlaza a cada arte', () => {
    const r = roomData(view());
    expect(r.artworks.length).toBe(6);
    expect(r.artworks[0]).toMatchObject({ href: '/artes/ajedrez-lavanderia', kind: 'patron' });
  });
});
