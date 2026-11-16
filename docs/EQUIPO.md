# Cómo seguimos: fases y reparto para trabajar en equipo

Este documento es el punto de partida para cualquiera que se sume. Explica qué hay, cómo está organizado el código, cómo trabajamos y qué viene después, repartido para que varias personas avancen a la vez sin pisarse.

## 1. Qué hay ahora

| Carpeta | Qué es | Estado |
|---|---|---|
| `index.html` | Maqueta v0 de la web (agosto) | Referencia visual, no se toca |
| `miniverso/` | Prototipo de la lavandería pixel en un solo HTML | Referencia; la versión viva está en `web/src/room/` |
| `web/` | **La tienda real**: Next.js 16 + Supabase + Stripe + Resend | Fases A y B hechas, lista para poner en marcha |
| `docs/PLAN_ECOMMERCE.md` | Estrategia: qué tienda queremos y por qué | Decisiones del 15/11 marcadas |
| `docs/plans/` | Planes por tareas ya ejecutados | Histórico |

La idea en una frase: **SOAP → lavandería**. Cada lavadora es un drop, todo producto nace de un **arte** (patrón de estampado, textura o textil) aplicado a un **soporte** (hoodie, camiseta, gorro, lámina, tela por metro, pañuelo), y el cliente entra con **Pompa**, una pompa de jabón que viste con la ropa de la tienda. En el mostrador atiende **Daniel**, la cara del futuro asistente con IA.

Cómo arrancarla, las reglas de dinero y stock y los pasos de producción: [`web/README.md`](../web/README.md).

## 2. Mapa del código (`web/`)

```
src/
  modules/
    catalog/    dominio (drops, artes, soportes, variantes, fases), vista, fuentes (Supabase o semilla), mockups pixel, datos de la sala
    checkout/   bolsa en cookie, presupuesto, flujo de pago, acciones de servidor, textos de /pedido
    payments/   sesión de Stripe Checkout y webhook
    mail/       correos de pedido (Resend)
  app/          páginas y rutas (artes, drops, ficha, bolsa, checkout, pedido, legales, API)
  components/   piezas de UI (ProductArt, Washer, CareLabel, VariantPicker…)
  data/         semilla de ejemplo → supabase/seed.sql
supabase/migrations/   esquema, reservas, pagos y permisos (la lógica de dinero vive aquí)
src/room/              la lavandería (TypeScript: dibujo vectorial en canvas + CSS acotado a #lavanderia)
tests/unit/            dominio + base de datos real en memoria (PGlite)
tests/e2e/             Playwright, escritorio y móvil, en modo demo
```

Regla de oro: **precio, stock y totales los decide la base** (`checkout_create`, `checkout_confirm_paid`). El navegador solo manda ids y cantidades. Cualquier cambio que toque dinero lleva prueba en `tests/unit/db/`.

## 3. Cómo trabajamos

**Ramas**
- `main`: lo que está en producción. Nadie empuja directo.
- `dev`: integración. Se despliega como *preview* en Vercel.
- `feature/<tema>` (o `fix/<tema>`) desde `dev`, PR hacia `dev`. De `dev` a `main` con una PR de release.

**Pull requests**
- Pequeñas y de un solo tema. Si pasa de ~400 líneas sin contar generados, se parte.
- Al menos una revisión de otra persona. Quien toca dinero, stock o permisos pide revisión a quien lleve backend.
- La CI (`.github/workflows/web.yml`) tiene que estar en verde: unitarias + base de datos, build y e2e.
- La descripción dice qué cambia, por qué, cómo se ha probado y capturas si hay cambio visual (escritorio y móvil).

**Base de datos**
- A partir de que exista el proyecto de Supabase de producción, **las migraciones no se editan**: cada cambio es un archivo nuevo en `supabase/migrations/` con fecha.
- Cada función nueva: `security definer`, `set search_path = ''`, `revoke` a `public, anon, authenticated` y `grant` solo a `service_role`. Cada tabla nueva: RLS activado.
- Si cambias la semilla: `pnpm seed:sql` y se sube el `seed.sql` regenerado (hay una prueba que lo exige).

**Pruebas**
- Primero la prueba que falla, luego el código. Un fallo arreglado sin prueba no cuenta como arreglado.
- `pnpm test` en local antes de abrir la PR; `pnpm build && pnpm e2e` si tocas páginas o la sala.

**Vercel**
- El proyecto `soapbrxnd` (equipo L'Atelier, plan Pro) despliega desde la carpeta `web/` con Next.js. Cada push a una rama con PR genera una *preview* privada (pide iniciar sesión en Vercel).
- Mientras el repositorio sea **público**, Vercel bloquea las previews de los pushes que no hace un miembro del equipo (por ejemplo, los de un bot o un agente). El proyecto `atelier-web`, con el repo privado, despliega sin problema. Para desbloquear: repositorio privado, o aprobar el despliegue desde Vercel, o que el push lo haga una persona del equipo.

**Secretos**
- Solo en `.env.local` y en Vercel. Nunca en el repo, en issues ni en el chat del equipo. La lista está en `web/.env.example`.

**Decisiones**
- Lo que no esté claro se decide, se apunta en la PR como «Decisión: qué, por qué, qué cuesta si nos equivocamos» y se sigue. Las grandes van a `docs/PLAN_ECOMMERCE.md`.

## 4. Áreas y responsables

| Área | Qué lleva | Carpetas | Responsable |
|---|---|---|---|
| **Producto y marca** | Fotos, artes, textos, guía de tallas, legal, precios, nombre definitivo | `src/data/`, contenido en Supabase, `app/legal/` | — |
| **Frontend y sala** | Páginas, diseño (`tk-`), lavandería pixel, accesibilidad, rendimiento | `src/app/`, `src/components/`, `src/room/` | — |
| **Backend y pagos** | Supabase, migraciones, Stripe, correos, panel, seguridad | `supabase/`, `src/modules/checkout`, `payments`, `mail`, `src/app/api/` | — |

*(Rellenar con nombres. Una persona puede llevar dos áreas.)*

## 5. Fases siguientes

Cada fase deja algo usable. Las que no dependen entre sí se hacen en paralelo.

```
           ┌─► D. Panel de administración ─┐
C. Puesta  │                                ├─► F. Drops completos ─► H. Daniel IA y crecimiento
en marcha ─┼─► E. Contenido real ───────────┘
           └─► G. Envíos y devoluciones
```

### Fase C — Puesta en marcha *(backend, con producto)*
**Objetivo:** la tienda en un dominio propio vendiendo en modo test de Stripe, y luego en real.
- Proyecto Supabase (región UE): migración + catálogo de partida; bucket `productos`.
- Stripe: claves de test, webhook con los 4 eventos, recibos activados; paso a claves reales al final.
- Resend: dominio verificado, `EMAIL_FROM`, `ORDER_NOTIFY_EMAIL`.
- Vercel: proyecto con *Root Directory* `web`, variables de entorno, `CRON_SECRET`, dominio propio, *preview* para `dev`.
- Decidir si se activa **Bizum** (Stripe lo ofrece; comprobar que confirma al momento).

**Hecho cuando:** una compra de prueba en el dominio real pasa a `paid`, baja el stock y llegan los dos correos.

### Fase D — Panel de administración *(backend + frontend)*
**Objetivo:** que Dani gestione la tienda sin tocar código ni Supabase.
- Acceso con email y MFA, roles (dueño, tienda) — patrón probado en L'Atelier (`adhara-web`, módulo `auth`).
- Drops: crear, programar fechas, ver la fase, previsualizar la sala.
- Artes y productos: subir arte (patrón) y fotos, variantes con precio y stock, sprite de Pompa.
- Pedidos: lista, estados (preparando, enviado), reembolsos (Stripe), pedidos «a revisar».
- Todas las escrituras por funciones `admin_*` con permisos, nunca con la clave de servicio desde el navegador.

**Se puede repartir:** backend hace funciones y permisos; frontend hace las pantallas contra datos de prueba.

### Fase E — Contenido real *(producto y marca, con frontend)*
**Objetivo:** dejar de vender mockups.
- Fotos de cada pieza (modelo, plano, detalle) y de cada arte en alta.
- Guía de tallas en cm por soporte; composición y gramaje reales.
- Textos legales revisados por un profesional (aviso legal, privacidad, cookies, condiciones, desistimiento con la excepción de tela a medida).
- Nombre definitivo (SOAPBRXND / SOAPBRXAND) y datos de contacto.
- Frontend: galería de fotos en la ficha con zoom y `next/image` contra Supabase Storage.

### Fase F — Drops completos *(backend + frontend)*
**Objetivo:** lanzar un drop con demanda sin miedo a bots ni a vender de más.
- Llaves de acceso anticipado validadas en servidor (tabla `drop_keys`, ya creada), canje en la lavadora 03.
- Lista de espera (tabla `waitlist`, ya creada) con consentimiento y correo al abrir.
- Captcha (Cloudflare Turnstile) en el checkout durante el drop; límite por cliente y talla.
- Archivo de drops pasados; un mueble nuevo en la sala por cada drop.
- Prueba de carga del checkout con la última unidad.

### Fase G — Envíos y devoluciones *(backend)*
- Tarifas reales por peso y zona; etiquetas y seguimiento con el transportista (reutilizar el módulo `shipping` de L'Atelier).
- Correo de «enviado» con seguimiento; devoluciones con reembolso desde el panel.

### Fase H — Daniel con IA y crecimiento *(backend + frontend)*
- Daniel con la API de Claude y herramientas de solo lectura (stock, tallas, drops, estado de un pedido), con límite de uso.
- **Compartir el look de Pompa**: imagen vertical para TikTok/stories con enlace a cada prenda.
- Analítica con consentimiento: embudo sala → ficha → bolsa → pago.

## 6. Mejoras técnicas propuestas

Ordenadas por impacto. Cada una cabe en una PR.

| # | Mejora | Por qué | Área |
|---|---|---|---|
| 1 | ESLint + Prettier con reglas compartidas en la CI | Hoy solo hay `tsc`; con varias personas el estilo diverge rápido | Frontend |
| 2 | Caché del catálogo (ISR o `unstable_cache` con revalidación al guardar desde el panel) | Cada página hace 7 consultas a Supabase en cada visita | Backend |
| 3 | Fotos con `next/image` y *loader* de Supabase | Tamaños y formatos adecuados, mejor Lighthouse | Frontend |
| 4 | ~~Pasar la sala a módulos TypeScript con pruebas~~ **Hecho**: vive en `src/room/` con pruebas en `tests/unit/room-logic.test.ts` y `tests/e2e/room.spec.ts` | Era JS plano sin tipos; costaba tocarla sin romperla | Frontend |
| 5 | Errores y avisos con Sentry (o similar) | Hoy los pedidos «a revisar» solo están en logs y correo | Backend |
| 6 | Auditoría de accesibilidad con axe en los e2e | Foco, contraste y lectores de pantalla en ficha y checkout | Frontend |
| 7 | Comprobación de moneda e identificar sesiones de Stripe por `metadata.order_id` | Más robusto ante eventos raros del webhook | Backend |
| 8 | Prueba de concurrencia real (dos compras de la última unidad a la vez) contra un Postgres de verdad en la CI | PGlite es una sola conexión y no puede probar carreras | Backend |
| 9 | Internacionalización (es/en) preparada en rutas | Si se vende fuera de España | Frontend |
| 10 | Vista de catálogo con `security_invoker` y *grants* explícitos en `private` | Lo pide el linter de Supabase | Backend |

## 7. Primera semana de alguien nuevo

1. Leer este documento, `web/README.md` y `docs/PLAN_ECOMMERCE.md`.
2. `cd web && pnpm install && pnpm dev`: entrar en la lavandería, comprar en modo demo.
3. `pnpm test` y `pnpm build && pnpm e2e` en local.
4. Elegir una mejora pequeña de la sección 6 o un *issue* con la etiqueta `primera-tarea`, y abrir su primera PR hacia `dev`.
