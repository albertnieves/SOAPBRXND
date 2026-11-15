import type { Metadata, Viewport } from 'next';
import { Footer, Header } from '@/components/Header';
import { isDemo } from '@/modules/catalog/source';
import { siteUrl } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'SOAPBRXND — Lavandería de drops', template: '%s · SOAPBRXND' },
  description: 'Patrones de estampado, texturas y textiles convertidos en prendas, láminas y tela. Cada lavadora es un drop.',
};
export const viewport: Viewport = { themeColor: '#070707', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {isDemo() && <p className="demo">MODO DEMO · catálogo de ejemplo, sin pagos</p>}
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
