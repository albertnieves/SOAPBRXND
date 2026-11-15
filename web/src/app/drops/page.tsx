import { Washer } from '@/components/Washer';
import { getCatalog } from '@/modules/catalog/source';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Drops', description: 'Cada lavadora es un drop: las que giran están a la venta.' };

export default async function Drops() {
  const view = await getCatalog();
  return (
    <>
      <h1>Drops</h1>
      <p className="tk-lede">Cada lavadora es un drop. Las que giran están a la venta; las demás esperan su turno.</p>
      <div className="tk-washers" style={{ marginTop: 28 }}>
        {view.visibleDrops().map((d) => <Washer key={d.id} drop={d} view={view} as="a" href={`/drops/${d.slug}`} />)}
      </div>
    </>
  );
}
