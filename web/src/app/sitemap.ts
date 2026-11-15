import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/env';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const view = await getCatalog();
  const base = siteUrl();
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/drops` }, { url: `${base}/artes` },
    ...view.visibleDrops().map((d) => ({ url: `${base}/drops/${d.slug}` })),
    ...view.artworks().map((a) => ({ url: `${base}/artes/${a.slug}` })),
    ...view.products().map((p) => ({ url: `${base}/p/${p.slug}` })),
  ];
}
