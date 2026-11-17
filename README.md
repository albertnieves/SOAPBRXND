# soapbrxand

Universo creativo y tienda de **Dani R.** — drops, identidad visual y lanzamientos entre música, moda y cultura de internet.

> ⚠️ **Lo que hay ahora es una MAQUETA.** Un boceto visual para tener algo tangible sobre lo que discutir. La identidad visual (colores, tipografías, layout, tono) **no está cerrada** y va a cambiar según avance el proyecto. No os caséis con nada de lo que veis.

---

## Dónde estamos y dónde vamos

**Ahora:** un `index.html` de 1 archivo, sin frameworks, sin backend, sin base de datos. Los drops son placeholders, el stock no existe, el formulario no envía nada y no se puede comprar.

**Objetivo:** un portfolio profesional con **tienda real** — catálogo con precios y stock modificables desde una base de datos, pasarela de pago funcionando, y un agente de IA llamado **Daniel** que asesore al cliente sobre moda, tallas, prendas y disponibilidad, como un dependiente-diseñador virtual.

---

## Recursos de diseño (Drive de Daniel)

Todos los recursos gráficos originales (logotipos, alfombrilla de entrada, etc.) viven en el Drive de Daniel:

📁 **[Recursos de Daniel — Google Drive](https://drive.google.com/drive/folders/1arHdh-M6kDr9UveVCHkBmZKq6DQZDQgN)**

- El Drive es la **fuente original**: ahí se guardan los archivos a máxima calidad y editables.
- En el repo solo entran las **versiones optimizadas para web**, dentro de `assets/`.
- Si un recurso cambia en el Drive, se vuelve a exportar y se sustituye en `assets/`, manteniendo el mismo nombre de archivo siempre que se pueda.
- El acceso al Drive es privado: pedid permiso a Dani si no lo tenéis.

---

## Trabajo realizado (maqueta v0)

| Sección | Estado |
|---|---|
| Intro / loading con counter y logo reveal | ✅ maqueta |
| Cursor personalizado con anillo magnético | ✅ maqueta |
| Hero con esfera, anillos animados y scanlines | ✅ maqueta |
| Marquee infinito | ✅ maqueta |
| Drops — 4 cards (available / coming soon / locked) con tilt 3D | ✅ maqueta |
| Archive — grid asimétrico con filtros por categoría | ✅ maqueta |
| About — monograma animado, bio y stats | ✅ maqueta |
| Next drop — countdown + form de notificación | ✅ visual, sin backend |
| Footer con redes | ✅ links vacíos |
| Responsive móvil / tablet / desktop | ✅ |

**Limitaciones conocidas:** todo hardcodeado, sin componentes reutilizables, sin tipado, sin tests, sin CMS, sin carrito, sin pagos, sin usuarios.

---

## Cómo arrancar la maqueta

```bash
git clone https://github.com/USUARIO/soapbrxand.git
cd soapbrxand
python3 -m http.server 8000   # o simplemente abre index.html
```

---

# 🚀 ULTRAPLAN

Cinco fases. Cada una deja el proyecto en un estado usable — no hace falta terminar todo para tener algo que enseñar.

---

## Fase 1 — Migración a framework

**Por qué:** el archivo único no escala. Necesitamos componentes, rutas y tipado antes de meter tienda.

**Stack propuesto:**
- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** para estilos
- **Framer Motion** para las animaciones actuales

**Tareas:**
- [ ] Inicializar proyecto Next.js
- [ ] Definir *design tokens* (colores, tipografías, espaciados) en un solo sitio — así cambiar la identidad visual es tocar un archivo, no cincuenta
- [ ] Portar cada sección a componente: `<Hero>`, `<DropCard>`, `<ArchiveGrid>`, `<Countdown>`, `<Footer>`
- [ ] Recrear animaciones con Framer Motion
- [ ] Deploy en Vercel con preview automático por rama

**Resultado:** mismo aspecto, código mantenible.

---

## Fase 2 — Backend y base de datos

**Por qué:** los precios y el stock tienen que poder cambiarse sin tocar código.

**Stack propuesto:** **Supabase** (PostgreSQL + Auth + Storage + API automática). Alternativa: Shopify headless si preferimos delegar la parte de comercio.

**Modelo de datos inicial:**

```
drops        → id, nombre, slug, fecha_lanzamiento, estado (available/coming/locked)
products     → id, drop_id, nombre, descripción, precio_base, imágenes[]
variants     → id, product_id, talla, color, stock, precio, sku
orders       → id, customer_id, total, estado, fecha
order_items  → id, order_id, variant_id, cantidad, precio_unitario
customers    → id, email, nombre, dirección
```

**Tareas:**
- [ ] Crear proyecto Supabase y esquema
- [ ] Subir imágenes reales a Supabase Storage
- [ ] Conectar el frontend: los drops y el archive se leen de la base de datos
- [ ] Panel de administración para que Dani edite productos, precios y stock sin tocar código
- [ ] Conectar el formulario "Notify me" a una tabla real

**Resultado:** contenido dinámico y editable.

---

## Fase 3 — Tienda real

**Por qué:** es el objetivo. Vender.

**Tareas:**
- [ ] Página de detalle de producto (`/drops/[slug]`) con selector de talla y stock en vivo
- [ ] Carrito persistente
- [ ] **Stripe Checkout** para el pago
- [ ] Webhook de Stripe que confirme el pedido y **descuente stock**
- [ ] Emails transaccionales (confirmación de pedido, envío) con Resend
- [ ] Cuenta de usuario e historial de pedidos
- [ ] **Legal obligatorio en España:** aviso legal, política de privacidad (RGPD), términos de venta, política de devoluciones, cookies

⚠️ Lo legal no es opcional si vendemos de verdad. Bloquea el lanzamiento.

**Resultado:** se puede comprar.

---

## Fase 4 — Daniel, el agente de IA

**Qué es:** un dependiente-diseñador virtual. El cliente le pregunta y él responde con datos reales del catálogo.

**Qué debe saber hacer:**
- Asesorar sobre estilo y combinaciones
- Recomendar talla según medidas o referencias del cliente
- Consultar stock y disponibilidad **en tiempo real**
- Explicar materiales, cuidados y la historia detrás de cada drop
- Mantener el tono de marca — Daniel no es un chatbot genérico, es parte de la identidad

**Cómo se construye:**
- API de Claude desde una ruta de servidor (la clave nunca en el cliente)
- **Tool calling:** Daniel consulta la base de datos para stock, tallas y precios en lugar de inventárselos
- Guía de tallas y fichas de producto como contexto
- UI de chat integrada en el diseño, no un widget pegado en la esquina

**Tareas:**
- [ ] Prototipo de conversación y definición de personalidad
- [ ] Endpoint seguro con las herramientas de consulta a Supabase
- [ ] Interfaz de chat
- [ ] Límites de uso para controlar coste
- [ ] Pruebas: que no invente stock ni prometa lo que no hay

**Resultado:** diferenciación real frente a cualquier tienda de streetwear.

---

## Fase 5 — Pulido y lanzamiento

- [ ] **Identidad visual definitiva** — aquí se cierra el diseño, no antes
- [ ] Optimización de imágenes (WebP/AVIF, lazy loading)
- [ ] SEO y Open Graph (que el link se vea bien al compartirlo)
- [ ] Accesibilidad — el cursor personalizado y los contrastes necesitan revisión
- [ ] Analytics (Plausible o Vercel Analytics)
- [ ] Dominio propio
- [ ] Rendimiento: objetivo Lighthouse > 90

---

## Cómo colaboramos

**Ramas:**
- `main` — estable y desplegable
- `dev` — integración
- `feature/nombre` — cada tarea

```bash
git checkout dev && git pull
git checkout -b feature/migracion-nextjs
# trabajas, commiteas
git push -u origin feature/migracion-nextjs
# Pull Request hacia dev
```

!!!!!!!!!!!!!!**Reglas:** !!!!!!!!!!!!!!!!!!!


IMPORTANTE CHAVALES NO ME LA LIEIS!!!!!!!!!!!!!

- Nada de push directo a `main`
- Cada PR revisado por al menos otro del equipo
- Commits descriptivos: `añade selector de tallas`, no `cambios`
- Los secretos (claves de Stripe, Supabase, Claude) van en `.env.local`, **nunca al repo**

---

## Reparto sugerido

| Área | Responsable |
|---|---|
| Diseño, identidad visual y contenido | — |
| Frontend, componentes y animaciones | — |
| Backend, base de datos, pagos y Daniel | — |

*(Rellenar con los nombres del equipo)*

---

## Primeros pasos para el equipo

1. Leer este README entero
2. Clonar el repo y abrir la maqueta para ver de qué partimos
3. Reunión para decidir: ¿confirmamos el stack de la Fase 1? ¿repartimos áreas?
4. Abrir issues en GitHub para las tareas de la Fase 1
5. Empezar

---

© 2026 soapbrxand — Built for drops, visuals & releases.
