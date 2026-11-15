import Link from 'next/link';
import { formatEuros } from '@/lib/money';
import { stockLabel, type Product } from '@/modules/catalog/domain';
import type { CatalogView } from '@/modules/catalog/view';
import { roomSprite } from '@/modules/catalog/room';
import { ProductArt } from './ProductArt';

export function ProductCard({ product, view }: { product: Product; view: CatalogView }) {
  const n = view.available(product);
  const label = stockLabel(n);
  const art = view.artwork(product.artworkId);
  return (
    <Link href={`/p/${product.slug}`} className="card">
      <div className="card-art">
        {n <= 3 && <span className={`tag ${n === 0 ? 'out' : 'low'}`}>{n === 0 ? 'AGOTADO' : 'ÚLTIMAS'}</span>}
        <ProductArt id={`c-${product.slug}`} sprite={roomSprite(view.support(product.supportId).slug)} spec={art.pattern} label="" />
      </div>
      <div className="card-meta">
        <strong>{product.name}</strong>
        <span>{view.variantsOf(product.id).length > 1 && new Set(view.variantsOf(product.id).map((v) => v.priceCents)).size > 1 ? 'desde ' : ''}{formatEuros(view.fromPriceCents(product))}</span>
        <small className="sr-only">{label}</small>
      </div>
    </Link>
  );
}
