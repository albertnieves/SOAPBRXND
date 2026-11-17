import Link from 'next/link';
import { formatEuros } from '@/lib/money';
import type { Product } from '@/modules/catalog/domain';
import type { CatalogView } from '@/modules/catalog/view';
import { roomSprite } from '@/modules/catalog/room';
import { ProductArt } from './ProductArt';

/** Una pieza colgada de la barra. Con fotos reales enseña la primera; si no, el mockup. */
export function ProductCard({ product, view }: { product: Product; view: CatalogView }) {
  const n = view.available(product);
  const art = view.artwork(product.artworkId);
  const variants = view.variantsOf(product.id);
  const several = new Set(variants.map((v) => v.priceCents)).size > 1;
  const photo = view.imagesOf(product)[0];
  return (
    <Link href={`/p/${product.slug}`} className="tk-piece">
      <span className="tk-piece-art">
        {n === 0 ? <span className="tk-sticker is-out">Agotado</span> : n <= 3 ? <span className="tk-sticker">Últimas</span> : null}
        {photo
          ? <img src={photo.url} alt="" loading="lazy" />
          : <ProductArt id={`c-${product.slug}`} sprite={roomSprite(view.support(product.supportId).slug)} spec={art.pattern} label="" />}
      </span>
      <span className="tk-piece-name">{product.name}</span>
      <span className="tk-piece-price">{several ? 'desde ' : ''}{formatEuros(view.fromPriceCents(product))}</span>
    </Link>
  );
}
