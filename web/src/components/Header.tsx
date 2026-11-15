import Link from 'next/link';
import { readCartCount } from '@/modules/checkout/server';

/* Pompa en 12×12 píxeles. */
function Pompa() {
  return (
    <svg viewBox="0 0 12 12" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M4 1h4v1h2v2h1v4h-1v2H8v1H4v-1H2V8H1V4h1V2h2z" fill="#17171b" />
      <path d="M4 2h4v1h2v1H9v1h1v3H9v2H8v0H4V9H2V4h1V3h1z" fill="#d9ecff" />
      <path d="M3 4h1V3h2v1H5v1H3z" fill="#fff" />
      <path d="M8 8h1v1H8zM7 9h1v1H7z" fill="#c9a7ff" />
      <path d="M4 6h1v2H4zM7 6h1v2H7z" fill="#17171b" />
    </svg>
  );
}

export async function Header() {
  const n = await readCartCount();
  return (
    <header className="tk-top">
      {/* Enlace normal: la lavandería necesita una carga completa para arrancar su script. */}
      <a href="/" className="tk-logo"><Pompa />SOAPBRXND</a>
      <nav aria-label="Tienda" className="tk-nav">
        <Link href="/drops">Drops</Link>
        <Link href="/artes">Artes</Link>
        <Link href="/bolsa" className="tk-bag">Bolsa <span data-testid="bag-count">{n}</span></Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <>
      <div className="tk-floor" aria-hidden="true" />
      <footer className="tk-foot">
        <span>© 2026 SOAPBRXND. Lavandería de drops.</span>
        <nav aria-label="Legal">
          <Link href="/legal/envios">Envíos</Link>
          <Link href="/legal/devoluciones">Devoluciones</Link>
          <Link href="/legal/condiciones">Condiciones</Link>
          <Link href="/legal/privacidad">Privacidad</Link>
          <Link href="/legal/cookies">Cookies</Link>
          <Link href="/legal/aviso-legal">Aviso legal</Link>
        </nav>
      </footer>
    </>
  );
}
