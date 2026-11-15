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
| Lavandería pixel | `public/room/room.js` y `room.css` (portados de `miniverso/`), datos en `GET /api/room` |

**Reglas que no se rompen**

- Precio, stock y total los calcula **la base** (`checkout_create`); el navegador solo manda ids y cantidades.
- Al empezar el pago se **reservan** las unidades 45 min; la sesión de Stripe caduca 10 min antes, así que quien paga a tiempo siempre tiene su pieza. Disponible = stock − reservas vivas. Dos compras de la última unidad se ponen en fila (`for update`).
- Si el cliente vuelve de Stripe sin pagar y empieza otro pago, su pedido anterior se libera (cookie `sbx_pedido`) para que su propia reserva no le diga «agotado».
- Solo tarjeta y Link (Apple Pay y Google Pay entran como tarjeta): nada de pagos diferidos como SEPA.
- El pedido solo pasa a pagado con el **webhook firmado** de Stripe. Cada evento se procesa una vez (`stripe_events`).
- Si el importe no cuadra, o el pago llega cuando ya no hay stock, el pedido queda en `needs_attention` para revisarlo y reembolsar.
- `anon` solo lee el catálogo publicado; pedidos, reservas y funciones de pago son solo de `service_role`.

Reutilizado de L'Atelier (`adhara-web`): dinero en céntimos, bolsa en cookie, zonas de envío por código postal, recálculo y bloqueo en la base, idempotencia por `request_id`. Distinto: catálogo centrado en el arte, un almacén con reservas en vez de movimientos, drops con fases y Stripe en vez de Redsys.

## Ponerla en marcha de verdad

1. **Supabase:** crea un proyecto (región UE). En SQL Editor ejecuta `supabase/migrations/20261115120000_tienda.sql` y luego `supabase/seed.sql` (o tu catálogo real). Copia URL, `anon key` y `service_role key` a `.env.local` y a Vercel.
2. **Stripe:** crea las claves (primero en modo test). En *Developers → Webhooks* añade `https://TU-DOMINIO/api/stripe/webhook` con los eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` y `checkout.session.expired`. Copia el *signing secret* a `STRIPE_WEBHOOK_SECRET`.
   En local: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. **Vercel:** proyecto con *Root Directory* = `web`, variables de `.env.example` y `CRON_SECRET`. El cron diario (`vercel.json`) marca como caducados los pedidos sin pagar; las reservas ya dejan de contar solas al vencer, y Stripe avisa de cada sesión caducada.
4. **Prueba completa en modo test:** compra con la tarjeta `4242 4242 4242 4242`, comprueba que el pedido pasa a `paid` y que baja el stock.

## Riesgos conocidos

- **Acaparar stock sin pagar:** cualquiera puede reservar piezas 45 min empezando pagos sin terminarlos. Antes del primer drop con mucha demanda: captcha en el checkout y límite de pedidos pendientes por cliente (fase D).
- **Sin emails ni panel todavía:** los pedidos que necesitan revisión (`needs_attention`) solo quedan en los logs de Vercel («stripe: pedido a revisar»). Activa los recibos de Stripe (*Settings → Customer emails*) mientras tanto.

## Pendiente (siguientes fases)

Panel de administración para Dani · emails de pedido (Resend, como en L'Atelier) · llaves de drop validadas en servidor · lista de espera · fotos reales y guía de tallas · textos legales revisados · Daniel con IA.
