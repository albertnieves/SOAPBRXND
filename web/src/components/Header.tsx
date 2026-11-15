import Link from 'next/link';
import { readCartCount } from '@/modules/checkout/server';

export async function Header() {
  const n = await readCartCount();
  return (
    <header className="top">
      <Link href="/" className="logo">SOAPBRXND</Link>
      <nav aria-label="Tienda">
        <Link href="/drops">Drops</Link>
        <Link href="/artes">Artes</Link>
        <Link href="/bolsa" className="bag">Bolsa <span data-testid="bag-count">{n}</span></Link>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <span>© 2026 SOAPBRXND · Lavandería de drops</span>
      <nav aria-label="Legal">
        <Link href="/legal/envios">Envíos</Link>
        <Link href="/legal/devoluciones">Devoluciones</Link>
        <Link href="/legal/condiciones">Condiciones</Link>
        <Link href="/legal/privacidad">Privacidad</Link>
        <Link href="/legal/cookies">Cookies</Link>
        <Link href="/legal/aviso-legal">Aviso legal</Link>
      </nav>
    </footer>
  );
}
