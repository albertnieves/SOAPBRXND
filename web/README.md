# SOAPBRXND · tienda (`web/`)

Next.js 16 + Supabase + Stripe. La portada es la **lavandería pixel**; debajo hay una tienda normal (drops, artes, fichas, bolsa, checkout) que también sirve a Google y a quien no quiera «jugar».

```bash
cd web
pnpm install
pnpm dev          # http://localhost:3000 — sin .env.local arranca en MODO DEMO
pnpm test         # unitarias + base de datos real en memoria (PGlite)
pnpm build && pnpm e2e   # extremo a extremo, escritorio y móvil
```

## Cómo está hecho

| Pieza | Dónde |
|---|---|
| Catálogo: **drop → arte → producto (arte × soporte) → variantes** | `src/modules/catalog/domain.ts` |
| Fases de drop por fecha (anunciado, con llave, abierto, agotado, archivo) | `dropPhase` |
| Fuente de datos: Supabase o semilla (modo demo) | `src/modules/catalog/source.ts` |
| Semilla de ejemplo | `src/data/seed.ts` → `pnpm seed:sql` → `supabase/seed.sql` |
| Base de datos, reservas y pagos | `supabase/migrations/20261115120000_tienda.sql` |
| Bolsa en cookie (`sbx_bolsa`, solo ids y cantidades) | `src/modules/checkout/cart.ts` |
| Stripe Checkout + webhook | `src/modules/payments/` y `src/app/api/stripe/webhook` |
| Mockups de pixel de cada pieza (silueta del soporte rellena con el arte) | `src/modules/catalog/mockup.ts` + `src/components/ProductArt.tsx` |
| Correos de pedido (Resend) | `src/modules/mail/` |
| Diseño de la tienda (pared de azulejo, barra, etiqueta cosida, ticket) | `src/app/globals.css`, clases `tk-` |
| Lavandería pixel | `public/room/room.js` y `room.css` (portados de `miniverso/`), datos en `GET /api/room` |

**Reglas que no se rompen**

- Precio, stock y total los calcula **la base** (`checkout_create`); el navegador solo manda ids y cantidades.
- Al empezar el pago se **reservan** las unidades 45 min; la sesión de Stripe caduca 10 min antes, así que quien paga a tiempo siempre tiene su pieza. Disponible = stock − reservas vivas. Dos compras de la última unidad se ponen en fila (`for update`).
- Si el cliente vuelve de Stripe sin pagar y empieza otro pago, su pedido anterior se libera (cookie `sbx_pedido`) para que su propia reserva no le diga «agotado».
- Solo tarjeta y Link (Apple Pay y Google Pay entran como tarjeta): nada de pagos diferidos como SEPA.
- El pedido solo pasa a pagado con el **webhook firmado** de Stripe. Cada evento se procesa una vez (`stripe_events`).
- Si el importe no cuadra, o el pago llega cuando ya no hay stock, el pedido queda en `needs_attention` para revisarlo y reembolsar.
- Como mucho **3 pagos a medias por email**: frena a quien quiera acaparar stock sin pagar.
- `anon` solo lee el catálogo publicado; pedidos, reservas y funciones de pago son solo de `service_role`.

Reutilizado de L'Atelier (`adhara-web`): dinero en céntimos, bolsa en cookie, zonas de envío por código postal, recálculo y bloqueo en la base, idempotencia por `request_id`. Distinto: catálogo centrado en el arte, un almacén con reservas en vez de movimientos, drops con fases y Stripe en vez de Redsys.

## Ponerla en marcha de verdad

1. **Supabase:** crea un proyecto (región UE). En SQL Editor ejecuta `supabase/migrations/20261115120000_tienda.sql` y luego `supabase/seed.sql` (o tu catálogo real). Copia URL, `anon key` y `service_role key` a `.env.local` y a Vercel.
2. **Stripe:** crea las claves (primero en modo test). En *Developers → Webhooks* añade `https://TU-DOMINIO/api/stripe/webhook` con los eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` y `checkout.session.expired`. Copia el *signing secret* a `STRIPE_WEBHOOK_SECRET`.
   En local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. **Vercel:** proyecto con *Root Directory* = `web`, variables de `.env.example` y `CRON_SECRET`. El cron diario (`vercel.json`) marca como caducados los pedidos sin pagar; las reservas ya dejan de contar solas al vencer, y Stripe avisa de cada sesión caducada.
4. **Correos (Resend):** verifica tu dominio en Resend y pon `RESEND_API_KEY` y `EMAIL_FROM`. Al confirmarse un pago se manda la confirmación al cliente y, si pones `ORDER_NOTIFY_EMAIL`, un aviso a la tienda (con «REVISAR» en el asunto si el pedido necesita atención). Sin esas variables no se envía nada.
5. **Fotos reales:** crea en Supabase Storage un bucket público `productos`, sube las fotos y añade una fila por foto en `product_images` (`product_id`, `url`, `alt`, `position`). La ficha y las tarjetas usan las fotos en cuanto existen; sin fotos se enseña el mockup de pixel.
6. **Prueba completa en modo test:** compra con la tarjeta `4242 4242 4242 4242`, comprueba que el pedido pasa a `paid` y que baja el stock.

## Riesgos conocidos

- **Acaparar stock sin pagar:** está limitado a 3 pagos a medias por email, pero un bot con muchos emails aún puede reservar piezas 45 min. Antes de un drop con mucha demanda: captcha en el checkout (fase D).
- **Sin panel todavía:** los pedidos se gestionan desde Stripe y Supabase. Los que necesitan revisión llegan por correo a `ORDER_NOTIFY_EMAIL` y quedan en los logs de Vercel («stripe: pedido a revisar»).
- **Sin fotos reales** el catálogo usa mockups de pixel: sirven para la demo, no para vender ropa.

## Pendiente (siguientes fases)

Panel de administración para Dani · email de envío con seguimiento · llaves de drop validadas en servidor · lista de espera · fotos reales y guía de tallas · textos legales revisados · Daniel con IA.
