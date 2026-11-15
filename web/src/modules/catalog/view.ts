/* Vista de solo lectura del catálogo para la tienda: búsquedas, fases y compra. */
import { dropPhase, isPurchasable, isVisible, type Artwork, type Drop, type DropPhase, type Product, type Support, type Variant } from './domain';

export type CatalogVariant = Variant & { available: number };
export type CatalogData = {
  drops: Drop[];
  artworks: Artwork[];
  supports: Support[];
  products: Product[];
  variants: CatalogVariant[];
};

export class CatalogView {
  readonly now: Date;
  private readonly data: CatalogData;
  private readonly phases = new Map<string, DropPhase>();

  constructor(data: CatalogData, now: Date = new Date()) {
    this.data = data;
    this.now = now;
    for (const d of data.drops) {
      const ids = new Set(data.products.filter((p) => p.dropId === d.id).map((p) => p.id));
      const soldOut = !data.variants.some((v) => ids.has(v.productId) && v.available > 0);
      this.phases.set(d.id, dropPhase(d, now, soldOut));
    }
  }

  phaseOf(drop: Drop): DropPhase { return this.phases.get(drop.id) ?? 'borrador'; }
  private visible = (d: Drop) => isVisible(this.phaseOf(d));

  visibleDrops(): Drop[] {
    return this.data.drops.filter(this.visible).sort((a, b) => a.number.localeCompare(b.number));
  }
  drop(id: string): Drop { return this.data.drops.find((d) => d.id === id)!; }
  dropBySlug(slug: string): Drop | null {
    const d = this.data.drops.find((x) => x.slug === slug);
    return d && this.visible(d) ? d : null;
  }

  /** Artes que están en alguna pieza visible. */
  artworks(): Artwork[] {
    const used = new Set(this.products().map((p) => p.artworkId));
    return this.data.artworks.filter((a) => used.has(a.id));
  }
  artwork(id: string): Artwork { return this.data.artworks.find((a) => a.id === id)!; }
  artworkBySlug(slug: string): Artwork | null { return this.artworks().find((a) => a.slug === slug) ?? null; }
  support(id: string): Support { return this.data.supports.find((s) => s.id === id)!; }

  /** Productos de drops visibles. */
  products(): Product[] {
    const order = new Map(this.visibleDrops().map((d, i) => [d.id, i]));
    const withVariants = new Set(this.data.variants.map((v) => v.productId));
    return this.data.products
      .filter((p) => order.has(p.dropId) && withVariants.has(p.id))
      .sort((a, b) => order.get(a.dropId)! - order.get(b.dropId)!);
  }
  productBySlug(slug: string): Product | null { return this.products().find((p) => p.slug === slug) ?? null; }
  productsOfDrop(dropId: string): Product[] { return this.products().filter((p) => p.dropId === dropId); }
  productsOfArtwork(artworkId: string): Product[] { return this.products().filter((p) => p.artworkId === artworkId); }

  variantsOf(productId: string): CatalogVariant[] { return this.data.variants.filter((v) => v.productId === productId); }
  variant(id: string): CatalogVariant | null { return this.data.variants.find((v) => v.id === id) ?? null; }
  available(product: Product): number { return this.variantsOf(product.id).reduce((s, v) => s + v.available, 0); }
  fromPriceCents(product: Product): number {
    const prices = this.variantsOf(product.id).map((v) => v.priceCents);
    return prices.length ? Math.min(...prices) : 0;
  }

  purchasable(product: Product): boolean {
    return isPurchasable(this.phaseOf(this.drop(product.dropId))) && this.available(product) > 0;
  }
}
