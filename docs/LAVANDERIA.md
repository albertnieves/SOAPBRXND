# La lavandería: cómo funciona y cómo tocarla

La portada de la tienda (`/`) es una sala isométrica que se recorre con un personaje, **Pompa**. Todo lo que hay en la sala está también en páginas normales (`/drops`, `/artes`, `/p/…`, `/bolsa`): la sala es otra forma de llegar, no la única.

Este documento explica qué se puede hacer en ella, cómo está montado el código y cómo añadir cosas sin romper nada.

## 1. Qué puede hacer quien entra

### Moverse

| Cómo | Qué hace |
|---|---|
| Tocar o hacer clic en el suelo | Pompa camina hasta ahí rodeando los muebles |
| Tocar un mueble | Pompa se acerca y lo usa |
| Flechas o `W` `A` `S` `D` | Caminar baldosa a baldosa (arriba es hacia el fondo de la sala) |
| `E` o `Intro` | Usar el mueble que tienes al lado |
| `1` `2` `3` `4` | Saludar, saltar, bailar, celebrar |
| `T` o `/` | Escribir a Daniel |
| `+` `-`, rueda del ratón, pellizco | Acercar y alejar |
| Arrastrar | Mover la cámara |
| `Esc` | Cerrar el panel abierto |

### Muebles y qué abre cada uno

| Mueble | Qué hace |
|---|---|
| Lavadoras | Una por drop (hasta cuatro). Abren el drop con sus piezas; el estado se ve en la puerta: girando, pronto, con candado o agotado |
| Perchero y prendas colgadas | Ficha rápida de cada prenda |
| Maniquí | El look destacado, con sus piezas |
| Caballete de láminas | Catálogo filtrado por láminas |
| Mesa de corte | Catálogo filtrado por telas y pañuelos |
| Cuadros de la pared | Cada arte, con su historia y las piezas que salen de él |
| Vestidor | Vestir a Pompa: piel, prenda de arriba, cabeza, gafas y gesto |
| Mostrador | Hablar con Daniel |
| Máquina de jabón | Un consejo de lavado |
| Interruptor | Luz de día o luz de ambiente |
| Banco | Sentarse |
| Puerta | Salir a la tienda en páginas normales |
| Calcetines perdidos | Hay cinco escondidos; con los cinco se desbloquea la piel «Calcetín de oro» |

### Comprar sin salir de la sala

La ficha rápida enseña precio, descripción, arte del que sale la pieza y sus variantes. Al elegir una variante se activa **AÑADIR A LA BOLSA**, que suma la pieza a la misma bolsa que usa el resto de la tienda. Desde la ficha también se puede **probársela a Pompa** o ir a la ficha completa.

### Daniel

Daniel contesta con respuestas fijas (todavía no hay IA detrás). Entiende:

- **Tallas**: «mido 175» o «mido 1,82» → recomienda una talla.
- **Recomendaciones**: «¿qué me recomiendas?» → elige una pieza que se pueda comprar y abre su ficha.
- **Stock y precio** de una pieza concreta si se la nombra («¿queda la camiseta pompa?»).
- **Envíos, devoluciones, llaves, drops y artes**.

### Qué se guarda

En el navegador de cada visitante (`localStorage`, con el prefijo `sbx_`): el nombre, el look de Pompa, los calcetines encontrados, la luz elegida y si el sonido está activo. No se manda nada al servidor. La bolsa va en la cookie `sbx_bolsa`, igual que en el resto de la tienda.

## 2. Cómo está montado

```
web/src/components/Room.tsx    componente cliente: carga el CSS, arranca la sala y la desmonta al salir
web/src/room/
  core.ts     proyección isométrica, color, trazados, caras de cajas y cilindros, sprites
  logic.ts    reglas puras: caminos, teclado, bolsa, hora del día, respuestas de Daniel
  art.ts      prendas y patrones dibujados (los mismos patrones que las fichas), iconos
  chars.ts    Pompa, Daniel y Rumbi (el robot que friega)
  scene.ts    paredes, suelo y muebles; qué baldosas ocupan y qué hace cada uno
  main.ts     motor: cámara, bucle de dibujo, entrada, paneles y sonido
  room.css    estilos del HUD y los paneles, todo bajo #lavanderia
web/src/modules/catalog/room.ts   los datos que recibe la sala (drops, piezas, artes)
web/src/app/api/room/route.ts     GET  /api/room   → esos datos en JSON
web/src/app/api/bolsa/route.ts    POST /api/bolsa  → añade una variante a la bolsa
```

### Datos

Al arrancar, la sala pide `GET /api/room`. La respuesta sale de `roomData()` en `modules/catalog/room.ts`, que lee el mismo catálogo que las páginas. Trae:

- `washers`: los drops visibles que no están en archivo, por número, como mucho `ROOM_WASHERS` (4).
- `items`: las piezas, con precio, estado de stock, arte, soporte y variantes.
- `artworks`: las artes, con su historia.

La sala no decide precios ni stock: los pinta. `POST /api/bolsa` vuelve a comprobar en el servidor que la variante existe, que su drop está abierto y que queda stock antes de escribir la cookie. Solo acepta JSON.

### Dibujo

Es un `<canvas>` dibujado con trazos vectoriales a la resolución de la pantalla, no pixel art.

- **Proyección**: `P(x, y, z)` en `core.ts` convierte baldosas a píxeles. Una baldosa mide 48×24; la sala tiene `COLS` × `ROWS` = 12 × 10 baldosas y la pared mide `WALL` = 252 de alto.
- **Ejes**: `x` crece hacia abajo a la derecha, `y` hacia abajo a la izquierda. La pared izquierda es `x = 0` y la derecha `y = 0`.
- **Sprites**: cada mueble se dibuja una vez en su propio lienzo y luego se copia en cada fotograma. Al cambiar el zoom se vuelven a dibujar a la resolución nueva, así que no se emborronan.
- **Capas vivas**: lo que se mueve (tambor de la lavadora, neón, reloj) va en la función `live` del mueble y se pinta en cada fotograma.
- **Profundidad**: muebles y personajes se ordenan por su posición en el suelo antes de pintarse.
- **Luz**: con la luz de ambiente se oscurece la sala y se suman focos de luz (`lights` en la escena).
- **Movimiento reducido**: si el sistema lo pide (`prefers-reduced-motion`), se quitan las animaciones decorativas.

### Recursos de marca

Casi todo se dibuja por código, salvo dos gráficos de marca que vienen del [Drive de Daniel](https://drive.google.com/drive/folders/1arHdh-M6kDr9UveVCHkBmZKq6DQZDQgN):

| Original en el Drive | Archivo servido | Dónde sale | Color |
|---|---|---|---|
| `alfombrilla-07.png` | `web/public/marca/alfombrilla.webp` | Felpudo de la puerta («get nak*ed») | crema `C.cream` |
| `logotipo/logotipo .png` | `web/public/marca/logotipo.webp` | Centro de la alfombra redonda | tinta `#17171b` |

- `web/src/room/brand.ts` los carga a la vez que `GET /api/room` y los deja en `env.brand`; `drawRugs()` en `scene.ts` los pinta en el suelo.
- Los archivos son **siluetas** (blanco + transparencia): el color lo pone la escena con `drawBrand(g, arte, color, …)`. Cambiar el color es tocar el código, no volver a exportar.
- Si alguno no carga, la sala arranca igual y dibuja lo de antes (`HOLA` en el felpudo, `SBX` en la alfombra).

**Para actualizar uno:** desde el original del Drive, recortar el margen transparente, redimensionar (alfombrilla a 720 px de ancho, logotipo a 480 px de alto: sobra para el zoom máximo), dejarlo en blanco conservando la transparencia y guardarlo como WebP sin pérdida con el mismo nombre en `web/public/marca/`.

### Montar y desmontar

`mount(ROOT)` en `main.ts` devuelve una función que desmonta la sala; `Room.tsx` la llama al salir de la portada sin recargar (por ejemplo, con el botón de volver). Mientras la sala está montada:

- `body` no hace scroll, y lo de debajo de la sala (cabecera, la tienda en HTML y pie) está `inert`, para que el teclado no se pierda por enlaces que no se ven.
- Lo que la sala escucha en `window` y `document` lleva la `signal` de un `AbortController`, y se suelta todo de una vez al desmontar.

Si `GET /api/room` falla, la pantalla de entrada ofrece «VER LA TIENDA SIN SALA», que desmonta la sala y deja la tienda normal.

Si añades un escuchador fuera de `ROOT`, pásale `on` (`addEventListener('x', f, on)`). Si añades un temporizador o un `requestAnimationFrame` que se repite, páralo en `destroy()`.

### Personajes

`drawPompa(g, outfit, pose)` dibuja a Pompa con el origen en los pies y unas 92 unidades de alto. `outfit` dice qué lleva (piel, prenda, gorro, gafas, gesto de la cara) y `pose` cómo está (andando, de espaldas, gesto en curso, hacia dónde mira). El vestidor y la pantalla de entrada usan la misma función.

## 3. Cómo añadir cosas

### Un mueble

En `scene.ts`, dentro de `buildScene`, con `floor(...)` (o `leftWall` / `rightWall` para algo colgado):

```ts
floor({
  id: 'lampara',                       // único
  label: 'LÁMPARA · ENCENDER',         // texto al pasar por encima
  tag: 'LUZ',                          // etiqueta flotante (opcional)
  box: [3.1, 7.1, 3.9, 7.9],           // x0, y0, x1, y1 en baldosas
  blocks: [[3, 7]],                    // baldosas por las que no se puede pasar
  use: [3, 8],                         // baldosa donde se coloca Pompa para usarlo
  act: 'lights',                       // qué hace (ver abajo)
}, 120 /* alto */, (g) => {
  // dibujo con las utilidades de core.ts: box, cyl, poly, ellipse…
});
```

Comprueba que la baldosa de `use` queda libre y que no tapas el camino a otro mueble.

### Una acción nueva

Las acciones son textos `nombre` o `nombre:argumento`. Se resuelven en `run()` de `main.ts`; añade ahí un `case`. Los botones del HUD y de los paneles usan `data-act` y se resuelven en `act()`.

### Una piel o un gesto de Pompa

- Piel: una entrada más en `SKINS` (`chars.ts`). Con `locked: true` no se puede elegir hasta desbloquearla.
- Gesto: añádelo a `Emote` y `EMOTE_TIME` y dibuja su postura en `drawPompa`.

### Una respuesta de Daniel

En `danielReply()` de `logic.ts`. Es una función pura: añade la regla y su prueba en `tests/unit/room-logic.test.ts`.

### Una prenda que Pompa pueda ponerse

No hay que tocar la sala: sale del catálogo. Si el soporte de la pieza es una prenda de arriba o de cabeza, aparece sola en el vestidor con su patrón.

## 4. Pruebas

| Qué | Dónde | Cómo |
|---|---|---|
| Caminos, teclado, bolsa, hora, Daniel | `tests/unit/room-logic.test.ts` | `pnpm test` |
| Datos que recibe la sala | `tests/unit/catalog-view.test.ts` (bloque `roomData`) | `pnpm test` |
| Alfombrilla y logotipo cargados | `tests/e2e/room.spec.ts` | `pnpm build && pnpm e2e` |
| `POST /api/bolsa`: reglas de stock, drop, topes y formato | `tests/unit/bag-route.test.ts` | `pnpm test` |
| La sala en el navegador, escritorio y móvil | `tests/e2e/room.spec.ts` | `pnpm build && pnpm e2e` |
| Montar y desmontar la sala, foco, fallo al cargar | `tests/e2e/room-lifecycle.spec.ts` | `pnpm build && pnpm e2e` |

Las e2e cubren: que la sala pinta el catálogo, la ficha rápida, añadir a la bolsa, los rechazos de `/api/bolsa`, el vestidor (y que el look se recuerda), el teclado, los calcetines, la luz y la recomendación de Daniel.

Para depurar en el navegador, la sala deja un objeto `window.__sbx` con el estado (`pompa`, `outfit`, `ITEMS`, `cam`, `env`, `socks`) y funciones (`run(act)`, `walkTo(x, y)`, `openPanel`). Las e2e lo usan; no es una API para el resto de la web.

## 5. Límites conocidos

- Daniel no es una IA: solo reconoce las frases de la lista de arriba.
- El progreso (look, calcetines) vive en el navegador; no se comparte entre dispositivos.
- La sala muestra como mucho cuatro lavadoras. Con más drops visibles, los siguientes solo salen en `/drops`.
