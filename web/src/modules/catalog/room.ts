/* Lo que la lavandería pixel necesita del catálogo (GET /api/room). */
import { ARTWORK_KIND_LABEL, stockLabel, type ArtworkKind, type DropPhase, type PatternSpec } from './domain';
import type { CatalogView } from './view';

export type RoomSprite = 'hoodie' | 'tee' | 'beanie' | 'print' | 'fabric' | 'scarf';
const SPRITES: Record<string, RoomSprite> = { hoodie: 'hoodie', tee: 'tee', gorro: 'beanie', lamina: 'print', 'tela-metro': 'fabric', panuelo: 'scarf' };

export type RoomData = {
  washers: { number: string; name: string; slug: string; phase: DropPhase; href: string; opensAt: string | null }[];
  items: {
    slug: string; name: string; href: string; dropNumber: string; priceCents: number; color: string;
    sprite: RoomSprite; wear: { slot: 'top' | 'head'; kind: string } | null; purchasable: boolean; stockLabel: string;
    pattern: PatternSpec;
  }[];
  artworks: { slug: string; name: string; kind: ArtworkKind; kindLabel: string; href: string; pattern: PatternSpec }[];
};

export function roomData(view: CatalogView): RoomData {
  const washers = view.visibleDrops().filter((d) => view.phaseOf(d) !== 'archivo').slice(0, 3).map((d) => ({
    number: d.number, name: d.name, slug: d.slug, phase: view.phaseOf(d), href: `/drops/${d.slug}`, opensAt: d.opensAt,
  }));
  const items = view.products().map((p) => {
    const s = view.support(p.supportId);
    return {
      slug: p.slug, name: p.name, href: `/p/${p.slug}`, dropNumber: view.drop(p.dropId).number,
      priceCents: view.fromPriceCents(p), color: p.color, sprite: SPRITES[s.slug] ?? 'tee', wear: s.wear,
      purchasable: view.purchasable(p), stockLabel: stockLabel(view.available(p)), pattern: view.artwork(p.artworkId).pattern,
    };
  });
  const artworks = view.artworks().map((a) => ({
    slug: a.slug, name: a.name, kind: a.kind, kindLabel: ARTWORK_KIND_LABEL[a.kind], href: `/artes/${a.slug}`, pattern: a.pattern,
  }));
  return { washers, items, artworks };
}
