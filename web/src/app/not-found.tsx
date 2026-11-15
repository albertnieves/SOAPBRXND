import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1>Aquí no hay nada en el tambor</h1>
      <p className="tk-lede">Esa página no existe o su drop todavía no se ha anunciado.</p>
      <p><Link className="tk-btn" href="/drops">Ver los drops</Link></p>
    </>
  );
}
