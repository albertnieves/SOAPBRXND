/* Lo que la lavandería pixel necesita del catálogo (GET /api/room). */
import { ARTWORK_KIND_LABEL, stockLabel, variantLabel, type ArtworkKind, type DropPhase, type PatternSpec, type SupportCategory } from './domain';
import type { CatalogView } from './view';

export type RoomSprite = 'hoodie' | 'tee' | 'beanie' | 'print' | 'fabric' | 'scarf';
const SPRITES: Record<string, RoomSprite> = { hoodie: 'hoodie', tee: 'tee', gorro: 'beanie', lamina: 'print', 'tela-metro': 'fabric', panuelo: 'scarf' };
export const roomSprite = (supportSlug: string): RoomSprite => SPRITES[supportSlug] ?? 'tee';

/** Máximo de lavadoras (drops) que caben en la pared de la sala. */
export const ROOM_WASHERS = 4;

export type RoomVariant = { id: string; label: string; priceCents: number; available: number };
export type RoomItem = {
  slug: string; name: string; href: string; dropNumber: string; priceCents: number; color: string;
  sprite: RoomSprite; wear: { slot: 'top' | 'head'; kind: string } | null; purchasable: boolean; stockLabel: string;
  pattern: PatternSpec;
  /** Para la ficha rápida de la sala: arte, soporte, texto y tallas con su stock. */
  artSlug: string; artName: string; support: string; category: SupportCategory; blurb: string; phase: DropPhase;
  variants: RoomVariant[];
};
export type RoomWasher = { number: string; name: string; slug: string; phase: DropPhase; href: string; opensAt: string | null; copy: string };
export type RoomArtwork = { slug: string; name: string; kind: ArtworkKind; kindLabel: string; href: string; pattern: PatternSpec; story: string };
export type RoomData = { washers: RoomWasher[]; items: RoomItem[]; artworks: RoomArtwork[] };

export function roomData(view: CatalogView): RoomData {
  const washers = view.visibleDrops().filter((d) => view.phaseOf(d) !== 'archivo').slice(0, ROOM_WASHERS).map((d) => ({
    number: d.number, name: d.name, slug: d.slug, phase: view.phaseOf(d), href: `/drops/${d.slug}`, opensAt: d.opensAt, copy: d.copy,
  }));
  const items = view.products().map((p) => {
    const s = view.support(p.supportId);
    const art = view.artwork(p.artworkId);
    const drop = view.drop(p.dropId);
    return {
      slug: p.slug, name: p.name, href: `/p/${p.slug}`, dropNumber: view.drop(p.dropId).number,
      priceCents: view.fromPriceCents(p), color: p.color, sprite: roomSprite(s.slug), wear: s.wear,
      purchasable: view.purchasable(p), stockLabel: stockLabel(view.available(p)), pattern: art.pattern,
      artSlug: art.slug, artName: art.name, support: s.name, category: s.category, blurb: p.description, phase: view.phaseOf(drop),
      variants: view.variantsOf(p.id).map((v) => ({ id: v.id, label: variantLabel(v, s), priceCents: v.priceCents, available: v.available })),
    };
  });
  const artworks = view.artworks().map((a) => ({
    slug: a.slug, name: a.name, kind: a.kind, kindLabel: ARTWORK_KIND_LABEL[a.kind], href: `/artes/${a.slug}`, pattern: a.pattern, story: a.story,
  }));
  return { washers, items, artworks };
}
