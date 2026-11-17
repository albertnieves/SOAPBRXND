import { notFound } from 'next/navigation';

const DOCS: Record<string, [string, string[]]> = {
  envios: ['Envíos', ['Península: 48–72 h laborables, 4,90 € (gratis desde 100 €). Baleares: 3–5 días, 7,90 €.', 'Las láminas viajan en tubo rígido y la tela, enrollada.', 'De momento no enviamos a Canarias, Ceuta ni Melilla.']],
  devoluciones: ['Devoluciones', ['Tienes 14 días naturales desde la entrega para desistir de la compra, sin dar motivos.', 'La tela cortada a medida y las piezas personalizadas no admiten desistimiento.']],
  condiciones: ['Condiciones de venta', ['Precios en euros con IVA incluido. El contrato se perfecciona con la confirmación del pago.']],
  privacidad: ['Privacidad', ['Usamos tus datos solo para gestionar tu pedido y, si lo aceptas, para avisarte de los drops.']],
  cookies: ['Cookies', ['Solo usamos cookies técnicas: la bolsa y el pedido en curso. No hay analítica ni publicidad.']],
  'aviso-legal': ['Aviso legal', ['Titular, NIF, domicilio y contacto: pendientes.']],
};

export function generateStaticParams() { return Object.keys(DOCS).map((doc) => ({ doc })); }
export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const d = DOCS[(await params).doc];
  return d ? { title: d[0], robots: { index: false } } : {};
}

export default async function Legal({ params }: { params: Promise<{ doc: string }> }) {
  const d = DOCS[(await params).doc];
  if (!d) notFound();
  return (
    <div className="tk-sheet">
      <h1>{d[0]}</h1>
      {d[1].map((t) => <p key={t}>{t}</p>)}
      <p className="tk-note">Texto provisional. Debe revisarlo un profesional antes de vender: es obligatorio en España.</p>
    </div>
  );
}
