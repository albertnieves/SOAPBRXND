import type { Metadata, Viewport } from 'next';
import { Footer, Header } from '@/components/Header';
import { isDemo } from '@/modules/catalog/source';
import { siteUrl } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'SOAPBRXND, lavandería de drops', template: '%s | SOAPBRXND' },
  description: 'Patrones de estampado, texturas y textiles convertidos en prendas, láminas y tela por metro. Cada lavadora es un drop.',
  openGraph: { siteName: 'SOAPBRXND', locale: 'es_ES', type: 'website' },
};
export const viewport: Viewport = { themeColor: '#ece8df', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;600;700&family=Silkscreen:wght@400;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {isDemo() && <p className="tk-demo">Modo demo: catálogo de ejemplo, sin pagos</p>}
        <Header />
        <main className="tk-main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
