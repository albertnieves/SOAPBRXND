# Plan — Tienda real SOAPBRXND, fases A y B

**Spec:** `docs/PLAN_ECOMMERCE.md` + decisiones del usuario (15/11/2026):
- Pagos con **Stripe**.
- Reutilizar lo que funciona de L'Atelier (`albertnieves/adhara-web`) pero con **otro diseño y otro enfoque de datos**.
- «Cuadros» = **artes**: patrones de estampado, texturas, textiles.

**Objetivo:** app Next.js en `web/` con catálogo real (drops → artes → productos → variantes), la lavandería pixel leyendo ese catálogo, fichas HTML, bolsa, checkout con Stripe confirmado por webhook y stock reservado sin sobreventa.

## Global Constraints

- Todo en `web/`; la maqueta (`index.html`) y `miniverso/` no se tocan salvo para enlazar.
- Dinero en **céntimos enteros, IVA incluido** (`lib/money.ts` de L'Atelier).
- Precio, stock y totales **solo los calcula el servidor/la base**; el navegador guarda en cookie solo `variantId:cantidad`.
- Stripe Checkout con `price_data` construido desde la base; el pago lo confirma **solo el webhook firmado**; eventos idempotentes.
- Secretos solo en variables de entorno (`.env.example` sin valores). No se crean proyectos de Supabase ni de Stripe desde aquí.
- Sin variables de entorno la app arranca en **modo demo**: catálogo de semilla, compra desactivada con aviso.
- Versiones fijadas (mismas que L'Atelier donde existan): next 16.4.4, react 19.3.0, zod 4.6.7, @supabase/supabase-js 2.117.2, vitest 5.0.5, typescript 6.0.3.

## Enfoque de datos (diferente a L'Atelier)

| L'Atelier | SOAPBRXND |
|---|---|
| Producto (perfume) → formatos | **Arte** (patrón/textura/textil) → **producto = arte × soporte** → variantes con `options` jsonb |
| Inventario por movimientos y ubicaciones | **Un almacén**: `variants.stock` + tabla `holds` (reservas con caducidad); disponible = stock − reservas vivas |
| Catálogo plano | Todo cuelga de **drops** con fases calculadas por fecha |
| Redsys: formulario firmado | **Stripe Checkout Session** + tabla `stripe_events` para idempotencia |

## Task 1: Andamiaje de `web/` y dinero

**Files:** `web/package.json`, `web/tsconfig.json`, `web/vitest.config.ts`, `web/next.config.ts`, `web/src/lib/money.ts`, `web/tests/unit/money.test.ts`
**Steps:**
1. Crear `package.json` (scripts `dev`, `build`, `start`, `test` = `vitest run`, `typecheck`), tsconfig estricto con alias `@/*`, vitest con `tests/unit/**`.
2. Test RED: `formatEuros(6500)` → `65 €`; `formatEuros(4990)` → `49,90 €`; `parseEuros('29,95')` → 2995; `grossToNet(12100, 2100)` → 10000.
   Run `cd web && pnpm test` — Expected: falla porque `money.ts` no existe.
3. Portar `money.ts` de L'Atelier (solo es-ES). Expected: verde.
**Test command:** `cd web && pnpm test`

## Task 2: Dominio de catálogo y fases de drop

**Files:** `web/src/modules/catalog/domain.ts`, `web/tests/unit/catalog-domain.test.ts`
**Interfaces:** produce tipos `Drop`, `Artwork`, `Support`, `Product`, `Variant`, `DropPhase`; funciones `dropPhase(drop, now, soldOut)`, `available(stock, held)`, `stockLabel(n)`.
**Steps:**
1. Tests RED:
   - `dropPhase`: `draft` → `borrador`; con `announce_at ≤ now < opens_at` → `anunciado`; `key_opens_at ≤ now < opens_at` → `llave`; `opens_at ≤ now` → `abierto`; abierto y sin stock → `agotado`; `archived_at ≤ now` → `archivo`.
   - `available(5, 2)` → 3; `available(1, 3)` → 0.
   - `stockLabel`: 0 → `AGOTADO`, 2 → `SOLO QUEDAN 2`, 9 → `EN STOCK`.
2. Implementar. Expected: verde.
**Test command:** `cd web && pnpm test`

## Task 3: Bolsa en cookie, zonas de envío y presupuesto

**Files:** `web/src/modules/checkout/cart.ts`, `web/src/modules/checkout/quote.ts`, tests `cart.test.ts`, `quote.test.ts`
**Interfaces:** consume `Variant` (Task 2). Produce `parseCart`, `serializeCart`, `addToCart`, `setLineQuantity`, `shippingZone(cp)`, `quote(lines, variantsById, zone)` → `{ itemsCents, shippingCents, totalCents, lines[] }`.
**Steps:**
1. Tests RED: cookie `sbx_bolsa` ida y vuelta; ignora basura; topes 10 por línea / 20 líneas; `shippingZone('28001')` → peninsula, `'07001'` → baleares, `'35001'` → null; envío península 490, Baleares 790, gratis en península desde 10000; variante desconocida → error `unavailable_variant`.
2. Portar `cart.ts` y `shippingZone` de L'Atelier; escribir `quote`. Expected: verde.
**Test command:** `cd web && pnpm test`

## Task 4: Catálogo de semilla

**Files:** `web/src/data/seed.ts`, `web/tests/unit/seed.test.ts`
**Interfaces:** consume tipos de Task 2. Produce `SEED: { drops, artworks, supports, products, variants }`.
**Steps:**
1. Test RED de integridad: slugs únicos; toda variante apunta a un producto y todo producto a un arte, un soporte y un drop existentes; precios > 0; cada soporte declara sus opciones y cada variante usa exactamente esas claves; al menos un arte de cada tipo (`patron`, `textura`, `textil`).
2. Escribir la semilla: drops 01 FIRST SIGNAL (abierto), 02 VISUAL PACK 001 (anunciado), 03 LOCKED (llave); artes (p. ej. «Ajedrez Lavandería», «Espuma», «Toalla Rizo», «Pompa Repeat», «Ruido Centrifugado»); soportes (hoodie, tee, gorro, lámina, tela por metro, pañuelo); productos y variantes con stock. Expected: verde.
**Test command:** `cd web && pnpm test`

## Task 5: Base de datos (migración + funciones) probada con PGlite

**Files:** `web/supabase/migrations/20261115120000_tienda.sql`, `web/scripts/seed-sql.ts` → `web/supabase/seed.sql`, `web/tests/unit/db/*.test.ts`, `web/tests/unit/db/pg.ts` (arranque de PGlite con roles `anon`, `authenticated`, `service_role`)
**Interfaces:** consume la semilla (Task 4). Produce tablas `drops, artworks, supports, products, variants, holds, orders, order_lines, stripe_events, waitlist, drop_keys`; vista `catalog_variants` (con `available`); funciones `checkout_create(p_request_id, p_items, p_contact, p_hold_minutes)`, `checkout_attach_session(p_order, p_session)`, `checkout_confirm_paid(p_event_id, p_session, p_amount_total)`, `checkout_expire(p_event_id, p_session)`, `holds_release_expired()`.
**Steps:**
1. Tests RED (cada uno contra la migración + `seed.sql` cargados en PGlite):
   - crear pedido reserva: `available` baja; totales = suma de precios + envío por zona;
   - pedir más de lo disponible → error `insufficient_stock` y no queda nada reservado;
   - mismo `request_id` dos veces → mismo pedido, una sola reserva;
   - variante de drop no abierto → `unavailable_variant`;
   - confirmar pago: pedido `paid`, `stock` baja, reservas borradas; repetir el mismo evento → sin cambios;
   - importe distinto al total → pedido `needs_attention`, stock sí descontado;
   - caducar sesión → `expired`, reservas liberadas; `holds_release_expired` libera reservas vencidas;
   - `anon` puede leer `catalog_variants` y no puede ejecutar `checkout_create` ni leer `orders`.
2. Escribir la migración y el generador de `seed.sql`. Expected: verde.
**Test command:** `cd web && pnpm test`

## Task 6: Fuentes de datos (semilla / Supabase) y datos de la sala

**Files:** `web/src/modules/catalog/source.ts`, `web/src/modules/catalog/seed-source.ts`, `web/src/modules/catalog/supabase-source.ts`, `web/src/modules/catalog/room.ts`, tests
**Interfaces:** consume Tasks 2, 4. Produce `getCatalog()` (elige fuente por entorno), `CatalogView` con `productBySlug`, `dropBySlug`, `artworkBySlug`, `productsOfDrop`, `variantsOf`; `roomData(catalog, now)` → JSON para la lavandería (lavadoras por drop con fase, prendas para el perchero, artes para la pared).
**Steps:**
1. Tests RED: la fuente de semilla encuentra por slug, calcula fases con `now` fijo, `roomData` da como mucho 3 lavadoras ordenadas por número y omite borradores, y cada prenda lleva `href: /p/<slug>`.
2. Implementar. La fuente Supabase lee la vista pública con el cliente anónimo (sin test de red; tipado). Expected: verde.
**Test command:** `cd web && pnpm test`

## Task 7: Stripe

**Files:** `web/src/modules/payments/stripe.ts`, `web/src/modules/payments/webhook.ts`, tests
**Interfaces:** consume el resumen de pedido de `checkout_create` (Task 5). Produce `checkoutSessionParams(order, baseUrl)`, `verifyEvent(raw, sig, secret)`, `handleEvent(event, rpc)`.
**Steps:**
1. Tests RED: parámetros con una línea `price_data` por línea en EUR y céntimos, envío como línea propia si > 0, `metadata.order_id`, `client_reference_id`, `expires_at` = fin de la reserva, URLs de vuelta; `verifyEvent` acepta una firma generada con `stripe.webhooks.generateTestHeaderString` y rechaza otra; `handleEvent` llama a `checkout_confirm_paid` en `checkout.session.completed` con `payment_status=paid`, a `checkout_expire` en `checkout.session.expired`, e ignora el resto.
2. Implementar. Expected: verde.
**Test command:** `cd web && pnpm test`

## Task 8: Páginas, acciones y rutas

**Files:** `web/src/app/**`, `web/src/components/**`, `web/src/modules/checkout/actions.ts`, `web/playwright.config.ts`, `web/tests/e2e/shop.spec.ts`
**Steps:**
1. E2E RED (modo demo, `next build && next start`): `/artes` lista artes por tipo; `/p/<slug>` muestra precio y tallas; elegir talla y añadir → `/bolsa` muestra la línea y el total; `/checkout` en modo demo avisa de que el pago no está activo; `/drops/first-signal` lista sus productos.
2. Implementar con diseño propio (negro/crema, Silkscreen + Space Mono, muestras de arte generadas en SVG): layout, `/`, `/artes`, `/artes/[slug]`, `/drops/[slug]`, `/p/[slug]`, `/bolsa`, `/checkout`, `/pedido`, legales provisionales, `/api/room`, `/api/stripe/webhook`, `/api/cron/liberar-reservas` (con `CRON_SECRET`). Expected: build verde y e2e verde.
**Test command:** `cd web && pnpm test && pnpm build && pnpm e2e`

## Task 9: La lavandería conectada

**Files:** `web/public/room/room.js` (portado de `miniverso/index.html`), `web/src/app/page.tsx`, `web/tests/e2e/room.spec.ts`
**Interfaces:** consume `/api/room` (Task 6/8).
**Steps:**
1. E2E RED: la portada pinta la sala; el panel PRODUCTOS lista las prendas de la API con enlace a `/p/<slug>`; la pared ARTES enlaza a `/artes`; BOLSA lleva a `/bolsa` y muestra el contador de la cookie.
2. Portar el script: datos desde `/api/room`, lavadoras por drop, pared de artes (sustituye al corcho), bolsa real. Expected: verde.
**Test command:** `cd web && pnpm test && pnpm build && pnpm e2e`

## Task 10: Documentación de puesta en marcha

**Files:** `web/README.md`, `web/.env.example`, `README.md`, `docs/PLAN_ECOMMERCE.md`
**Steps:** pasos para crear el proyecto Supabase, aplicar migración y semilla, claves y webhook de Stripe (`checkout.session.completed`, `checkout.session.expired`), cron en Vercel; marcar decisiones tomadas en el plan.
**Test command:** `cd web && pnpm test`

## Review Focus

- Carreras de stock: dos `checkout_create` simultáneos sobre la última unidad (PGlite es una sola conexión: revisar el bloqueo `for update` a mano).
- Webhook: firma, idempotencia, importe que no cuadra, pago que llega tras caducar la reserva.
- Que ningún precio venga del navegador.
- RLS/permisos: qué puede leer y ejecutar `anon`.
