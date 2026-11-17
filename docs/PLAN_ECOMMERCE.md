# De lavandería pixel a e-commerce real

Revisión del miniverso pixel (`miniverso/index.html`) y propuesta para convertirlo en una tienda real de **prendas, cuadros y estampados** organizada en **drops**.

---

> **Decisiones tomadas (15/11/2026):** pagos con **Stripe**; se reutiliza lo que funciona de L'Atelier con otro enfoque de datos (catálogo centrado en el arte); los «cuadros» son **artes**: patrones de estampado, texturas y textiles. Fases A y B hechas en `web/` (ver `web/README.md`).

## 0. En cinco líneas

1. **La sala pixel es la portada y la experiencia, no la tienda entera.** Cada producto necesita además su página HTML normal (`/p/hoodie-first-signal`) con fotos reales, para Google, para compartir en TikTok/Instagram y para quien quiera comprar rápido.
2. **Un solo modelo de datos para tres tipos de producto**: producto → variantes (talla, formato, acabado, marco…) con precio y stock por variante. Las prendas, los cuadros y los estampados se diferencian por las opciones, no por tablas distintas.
3. **Los drops se gestionan desde la base de datos con un ciclo de vida** (borrador → anunciado → con llave → abierto → agotado → archivo). La sala se dibuja sola según el estado: no se vuelve a tocar código por cada drop.
4. **Reutilizad lo que ya funciona en L'Atelier du Désert** (Supabase, Vercel, TPV BBVA/Redsys, Resend, panel de admin, envíos). Es la vía más corta a la primera venta real.
5. **Orden:** catálogo real y fichas → pago con stock seguro y legal → cuadros y estampados → drops avanzados (llaves, lista de espera, antibots) → Daniel con IA y compartir el look de Pompa.

---

## 1. Revisión de lo que hay

**Funciona bien y vale la pena mantener:** la sala isométrica, Pompa con su vestidor, las lavadoras como drops, la cuenta atrás, la bolsa que no deja pedir más que el stock, y que todo se pueda hacer desde los botones sin «jugar».

**Arreglado en esta revisión:**

| Fallo | Arreglo |
|---|---|
| El catálogo y la ficha ponían siempre «01 · FIRST SIGNAL», aunque el producto fuera de otro drop | Ahora se agrupa y etiqueta por su drop real |
| Si cambia el catálogo, una bolsa guardada con un producto que ya no existe rompía la bolsa | Al cargar se descartan líneas inválidas y se ajusta la cantidad al stock |
| En móvil, tocar a Daniel abría el teclado | Solo se enfoca el chat con ratón |

**Falta para vender de verdad** (de más a menos grave):

| Problema | Por qué importa | Se resuelve en |
|---|---|---|
| No hay pago | No se vende | Fase B |
| Precios y stock están en el código y en el navegador del cliente | Cualquiera puede manipularlos; Dani no puede editarlos | Fase A |
| La llave de la lavadora 03 está en el código fuente | Cualquiera la lee con «ver código» | Fase D |
| Sin fotos reales, solo pixel art | Nadie compra una prenda de 65 € sin verla | Fase A |
| Todo vive dentro de un `<canvas>` | Google no ve los productos, no hay enlace para compartir una prenda | Fase A |
| Sin textos legales | Obligatorio en España, bloquea el lanzamiento | Fase B |
| Precios en euros con decimales (`65.5`) | Errores de redondeo con IVA y descuentos | Fase A (usar céntimos) |
| El modal no atrapa el foco del teclado | Accesibilidad | Fase E |

---

## 2. Los tres tipos de producto

Un solo esquema (`products` + `variants`), pero cada tipo tiene su mueble en la sala, sus opciones y su ficha.

### Prendas

- **En la sala:** el perchero ROPA (ya existe). Cada prenda colgada se pinta con el color real del producto.
- **Variantes:** talla × color. Stock propio y limitado por drop.
- **Ficha:** fotos (modelo, plano, detalle de la tela y del estampado), **guía de tallas en cm** y medidas de la prenda, composición y gramaje, cuidados, «probar en Pompa».
- **Pompa:** cada prenda que se puede vestir lleva su sprite pixel (color + forma: hoodie, tee, gorro…). Al comprarla, Pompa la «tiene» en su armario.

### Cuadros

- **En la sala:** propongo una **segunda sala, «La Galería»**, a la que se entra por una puerta de la lavandería (o una pared de cuadros si preferís una sola sala). Cada marco de la pared es un cuadro real, en miniatura pixel; al tocarlo se abre su ficha.
- **Variantes:** tamaño (A4, A3, 50×70…), soporte (papel fine art, lienzo), con o sin marco y color del marco. Cada combinación tiene su precio.
- **Ediciones limitadas:** `edicion_total` (p. ej. 25) y al vender se asigna el **número de copia** («7/25») que aparece en el pedido y en el certificado. Esto encaja con la lógica de drop.
- **Ficha:** la obra a pantalla completa, **simulación en una pared** con su tamaño real, autor y fecha, papel/tinta, plazo de producción si es bajo demanda.
- **Producción:** dos caminos, se pueden mezclar:
  - *Edición numerada* impresa en una imprenta local: más margen, más control, stock propio.
  - *Bajo demanda* (servicios como Gelato o Printful, con producción en Europa): sin stock, se imprime al venderse; menos margen.

### Estampados

Hay que decidir qué significa (ver §10). Propongo la opción que más valor da:

- **Un estampado es un diseño** (una tabla `designs`) que puede ir sobre varios soportes: camiseta, sudadera, tote, lámina. Cada combinación diseño + soporte es un producto con sus variantes.
- **En la sala:** una **mesa de serigrafía** en la lavandería. Al tocarla se ve el muestrario de diseños; eliges diseño → soporte → talla.
- **Bonus que encaja con Pompa:** probar el estampado sobre la ropa de Pompa en el vestidor antes de comprar.
- **Producción:** bajo demanda (no hay que tener stock de cada diseño en cada talla) o tiradas cortas en drops.

---

## 3. Drops

### Ciclo de vida

```
borrador → anunciado → con llave → abierto → agotado → archivo
```

| Estado | En la sala | En la tienda |
|---|---|---|
| borrador | No aparece | Solo lo ve el admin |
| anunciado | Lavadora con cinta amarilla + cuenta atrás | Ficha visible sin botón de compra, lista de espera |
| con llave | Lavadora con candado | Solo compra quien tenga llave válida (acceso anticipado) |
| abierto | Lavadora girando | Se compra |
| agotado | Lavadora parada, «AGOTADO» | Fichas visibles, «agotado» |
| archivo | Pasa a la **secadora/archivo** | Se ve el drop en el archivo, sin compra |

Los cambios de estado se programan con fecha (`abre_en`, `cierra_en`) y se aplican solos; nadie tiene que estar despierto a las 20:00.

### Muchos drops en una sala pequeña

- La pared tiene **sitio para 3–4 lavadoras**: se muestran el drop abierto, el próximo y el de llave. Se generan desde la base de datos.
- Los drops pasados se ven en el **archivo** (el corcho actual o una secadora), con sus piezas agotadas: es historia de marca y prueba social.
- Idea de narrativa: **cada drop añade un mueble a la sala** (un póster, una planta, una máquina de refrescos…). Quien vuelve ve que la lavandería crece.

### Llaves (acceso anticipado)

- Se crean desde el admin: código, drop, usos máximos, caducidad. Se guardan **cifradas (hash) en la base de datos** y se validan en el servidor; nunca en el código de la página.
- Se reparten como queráis: en TikTok, a la lista de espera, a compradores anteriores.

### Que no se rompa el día del drop

Un drop concentra mucha gente en pocos minutos. Imprescindible:

- **Reserva de stock al empezar el pago** (10–15 min). Si no paga, la reserva caduca y vuelve al stock. Así no se venden dos veces las últimas unidades.
- **Descuento de stock atómico en la base de datos** (una función SQL con bloqueo), y confirmación del pago por **webhook idempotente** (si llega dos veces, cuenta una).
- **Límite por cliente** (p. ej. 2 por talla) y **captcha** (Cloudflare Turnstile) en el checkout durante el drop, contra bots de reventa.
- **La lista de espera** manda un email cuando abre el drop y otro cuando queda poco.

---

## 4. Arquitectura

### Recomendación

**Reutilizar el stack de L'Atelier du Désert** (por lo que veo en vuestras sesiones: Supabase, Vercel, TPV BBVA por Redsys, Resend para emails, panel de admin con roles y gestión de envíos). Ya está probado en producción, ya conocéis sus problemas, y las piezas difíciles (pago con banco español, emails, admin, envíos) ya existen.

| Opción | A favor | En contra |
|---|---|---|
| **A. Stack propio reutilizado** *(recomendada)* | Control total de la experiencia pixel y de los drops; sin cuota mensual; ya lo tenéis hecho una vez | Mantenerlo vosotros |
| B. Shopify headless | Pago, impuestos, stock y apps de bajo demanda resueltos | Cuota + comisiones; la lógica de drops/llaves/reservas encaja peor; otro sistema que aprender |

### Cómo encaja la sala

- Proyecto **Next.js** (como propone el README en la Fase 1). La sala es un componente de cliente: el código del canvas actual se traslada casi tal cual.
- La sala **lee el catálogo de una API** (`/api/room`) en vez de llevarlo escrito: drops, productos con su sprite pixel, estados y stock resumido.
- **Rutas HTML reales**, renderizadas en servidor:
  - `/` → la lavandería
  - `/drops/[slug]` → página del drop
  - `/p/[slug]` → ficha de producto (con datos estructurados `Product` para Google e imagen para compartir)
  - `/galeria` → la sala de cuadros
  - `/bolsa`, `/checkout`, `/pedido/[id]`, legales
- Al tocar un mueble se abre el panel encima de la sala **y cambia la URL** (`/p/hoodie-first-signal`): el enlace se puede compartir y abre la sala con esa ficha encima.

### Imágenes

- Fotos reales en Supabase Storage, servidas en WebP/AVIF a varios tamaños.
- El pixel art de cada producto se genera desde sus datos (color, forma), como ahora, o se dibuja a mano para piezas especiales.

---

## 5. Modelo de datos

Precios siempre en **céntimos** (enteros) e **IVA incluido** en el precio que se muestra.

```
drops            id, slug, numero, nombre, descripcion, estado, abre_en, cierra_en,
                 requiere_llave, hueco_sala (qué lavadora), mueble_extra, portada
designs          id, slug, nombre, artista, archivo_original           -- estampados
products         id, drop_id, design_id?, tipo (prenda|cuadro|estampado|accesorio),
                 slug, nombre, descripcion, cuidados, precio_base_cents,
                 sprite (json: forma, color, estampado), slot_pompa?, activo, orden
product_images   id, product_id, url, alt, orden
variants         id, product_id, sku, talla?, color?, formato?, soporte?, marco?,
                 precio_cents, stock (null = bajo demanda), produccion (stock|demanda),
                 ref_proveedor?, edicion_total?, edicion_vendida
keys             id, drop_id, codigo_hash, usos_max, usos, caduca_en
waitlist         id, email, drop_id, consentimiento, creado_en
customers        id, email, nombre, telefono
addresses        id, customer_id, ...
stock_reservations id, variant_id, cantidad, checkout_id, expira_en
orders           id, customer_id, estado (pendiente|pagado|preparando|enviado|
                 entregado|devuelto|cancelado), subtotal, envio, iva, total,
                 pago_ref, creado_en
order_items      id, order_id, variant_id, cantidad, precio_unit_cents, numero_edicion?
shipments        id, order_id, transportista, seguimiento, estado
returns          id, order_id, motivo, estado
pompa_looks      id, customer_id?, skin, prendas (json), imagen_compartible?
```

Seguridad: políticas RLS en Supabase para que el cliente solo lea catálogo público y sus propios pedidos; precios, stock y llaves se calculan y validan **siempre en el servidor**.

---

## 6. Pago, envíos, impuestos y legal (España)

- **Pago:** Redsys (BBVA), que ya tenéis integrado en L'Atelier, o Stripe. Redsys suele salir más barato con el banco; Stripe da Apple Pay / Google Pay / Bizum más fácil y su checkout es muy rápido de montar. Decisión vuestra (§10).
- **IVA:** precios mostrados con IVA (21 %). Si se vende a otros países de la UE y se pasa del umbral de ventas a distancia, hay que registrarse en ventanilla única (OSS): consultarlo con la gestoría antes de abrir fuera de España.
- **Envíos:** tarifas por zona y peso; los cuadros necesitan embalaje rígido y tarifa propia. Reutilizar el panel de envíos de L'Atelier.
- **Emails:** confirmación de pedido, envío con seguimiento, aviso de drop, lista de espera, carrito abandonado (con consentimiento).
- **Legal obligatorio:** aviso legal, privacidad (RGPD), cookies con consentimiento real, condiciones de venta y **derecho de desistimiento de 14 días**. Ojo: los productos **personalizados o hechos a medida** pueden quedar excluidos del desistimiento; hay que decirlo claro en la ficha. Que lo revise un profesional.
- **Facturas:** generar factura/ticket por pedido.

---

## 7. Panel de administración (para Dani)

Sin tocar código:

- **Drops:** crear, programar fechas, cambiar estado, elegir qué lavadora ocupa y qué mueble añade a la sala, ver una vista previa de la sala.
- **Productos:** tipo, fotos (arrastrar y soltar), variantes con precio y stock, el sprite de Pompa (forma + color + estampado) con vista previa.
- **Diseños/estampados:** subir el diseño y elegir en qué soportes se vende.
- **Llaves:** generar en lote, ver usos.
- **Pedidos y envíos:** estados, etiquetas, devoluciones.
- **Lista de espera:** exportar y lanzar el aviso del drop.

---

## 8. Daniel con IA (Fase 4 del README)

- Endpoint en el servidor con la API de Claude; la clave nunca en el navegador.
- **Herramientas** para consultar stock, tallas, precios, estado de drops y de un pedido. Que nunca invente: si la herramienta no lo dice, Daniel no lo sabe.
- Contexto: guía de tallas, fichas, política de envíos y devoluciones, tono de marca.
- Límite de mensajes por sesión para controlar el coste, y el modo actual de respuestas fijas como respaldo si la IA falla.
- En la sala ya tiene su sitio: el mostrador y los bocadillos.

---

## 9. Crecimiento y calidad

**Para vender más:**

- **Compartir el look de Pompa:** botón que genera una imagen vertical (Pompa con su ropa + logo + enlace) lista para TikTok o stories. Es contenido gratis y lleva a la ficha de cada prenda.
- Imagen de vista previa propia para cada drop y producto al compartir el enlace.
- Llaves de acceso anticipado repartidas en TikTok: convierte seguidores en compradores el primer minuto.
- «Agotado es agotado»: mostrar unidades restantes reales y cuántas personas hay en la lista de espera.

**Calidad:**

- Analítica del embudo: entrada a la sala → mueble tocado → ficha → bolsa → pago. Saber si la sala ayuda o estorba a la compra.
- Rendimiento: la sala carga el catálogo en una sola petición; fotos en tamaños adecuados; objetivo Lighthouse > 90 en las fichas.
- Accesibilidad: foco atrapado en los paneles, navegación con teclado, textos alternativos; la versión «sin jugar» (botones) ya existe.
- Pruebas automáticas de lo crítico: reserva y descuento de stock, webhook de pago, validación de llaves, totales con IVA.

---

## 10. Hoja de ruta

Cada fase deja algo usable.

**Fase A — Catálogo real.** Proyecto Next.js con la sala portada tal cual. Supabase con el esquema de §5. La sala y las fichas leen de la base de datos. Fichas HTML con fotos reales y guía de tallas. Panel mínimo para productos, variantes y drops.
*Resultado: Dani cambia precios, stock y drops sin tocar código; los productos se pueden compartir y Google los ve.*

**Fase B — Primera venta (solo prendas del drop 01).** Checkout con reserva de stock, pago, webhook, emails, envíos y textos legales.
*Resultado: se puede comprar de verdad.*

**Fase C — Cuadros y estampados.** La Galería (segunda sala) y la mesa de serigrafía. Variantes de formato/marco, ediciones numeradas y, si se elige, conexión con un proveedor bajo demanda.
*Resultado: los tres tipos de producto a la venta.*

**Fase D — Drops completos.** Cambios de estado programados, llaves en el servidor, lista de espera con emails, límites por cliente, captcha, archivo de drops pasados, muebles nuevos por drop.
*Resultado: un drop se lanza solo, sin miedo a bots ni a vender de más.*

**Fase E — Daniel con IA, compartir look, analítica y accesibilidad.**

---

## 11. Decisiones que necesitamos de vosotros

1. **Stack:** ¿reutilizamos el de L'Atelier (recomendado) o preferís Shopify?
2. **Pago:** ¿Redsys/BBVA como en L'Atelier, o Stripe?
3. **«Estampados»:** ¿son diseños que van sobre varias prendas y soportes (mi propuesta), o láminas/prints en papel?
4. **Producción de cuadros y estampados:** ¿ediciones numeradas con stock propio, bajo demanda, o las dos?
5. **Galería de cuadros:** ¿segunda sala o una pared dentro de la lavandería?
6. **Nombre:** ¿SOAPBRXND o SOAPBRXAND?
7. **Mercado de lanzamiento:** ¿solo España o también la UE?
8. **Contenido:** fotos reales, guía de tallas, textos legales y datos de contacto: ¿quién los prepara y para cuándo?
