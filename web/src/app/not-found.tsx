import Link from 'next/link';

export default function NotFound() {
  return (<><p className="eyebrow">404</p><h1>Aquí no hay nada en el tambor</h1><p><Link href="/">Volver a la lavandería</Link></p></>);
}
