/* Lavandería pixel — portado de miniverso/index.html y conectado a /api/room. */
(() => {
'use strict';
document.getElementById('lavanderia').innerHTML = `

<div id="stage" aria-label="Tienda en pixel: una lavandería. Toca el suelo para moverte y los muebles para usarlos. Todas las acciones están también en los botones.">
  <canvas id="room" width="320" height="256"></canvas>
  <div id="tags"></div>
  <div id="says"></div>
</div>
<div id="tip"></div>

<button class="chip" data-act="login" aria-label="Tu perfil">
  <canvas id="chipAv" width="22" height="22"></canvas>
  <span class="who"><span id="nick">INVITADO</span><small>ENTRAR</small></span>
</button>

<nav class="rail left" aria-label="Lavandería">
  <button class="rbtn" data-act="drops"><img data-icon="washer" alt="">DROPS</button>
  <button class="rbtn" data-act="wardrobe"><img data-icon="hanger" alt="">VESTIDOR</button>
  <button class="rbtn" data-act="key"><img data-icon="key" alt="">TU LLAVE</button>
  <button class="rbtn" data-act="artworks"><img data-icon="frame" alt="">ARTES</button>
</nav>
<nav class="rail right" aria-label="Información">
  <button class="rbtn" data-act="story"><img data-icon="book" alt="">HISTORIA</button>
  <button class="rbtn" data-act="contact"><img data-icon="mail" alt="">CONTACTO</button>
  <button class="rbtn" data-act="shipping"><img data-icon="truck" alt="">ENVÍOS</button>
  <button class="rbtn" data-act="returns"><img data-icon="back" alt="">DEVOLUC.</button>
</nav>

<form id="chat" autocomplete="off">
  <input id="chatIn" maxlength="120" placeholder="Habla con Daniel… (tallas, drops, envíos)" aria-label="Mensaje">
  <button type="submit">DECIR</button>
</form>

<nav id="dock" aria-label="Tienda">
  <button class="dbtn" data-act="catalog"><img data-icon="grid" alt="">PRODUCTOS</button>
  <button class="dbtn shop" data-act="home">SHOP</button>
  <a class="dbtn" href="/bolsa"><img data-icon="bag" alt="">BOLSA<span class="n" id="bagN"></span></a>
</nav>

<div class="zoom" role="group" aria-label="Zoom de la sala"><button data-act="zoom-in" aria-label="Acercar">+</button><button data-act="zoom-out" aria-label="Alejar">-</button></div>

<div id="toast" role="status" aria-live="polite"></div>

<div id="panel" hidden>
  <div class="win" role="dialog" aria-modal="true" aria-labelledby="pTitle">
    <header><h2 id="pTitle"></h2><button data-act="close" aria-label="Cerrar">X</button></header>
    <div class="body" id="pBody"></div>
  </div>
</div>

<div id="intro">
  <div>
    <canvas class="logo" id="introLogo"></canvas>
    <div class="sub">LAVANDERÍA DE DROPS · ABIERTA 24H</div>
    <canvas class="pompa" id="introPompa" width="22" height="28"></canvas>
    <div class="bar"><i></i></div>
    <button class="pbtn" id="enter" disabled>CARGANDO…</button>
  </div>
</div>

`;

/* =========================================================
   Datos: llegan de /api/room (catálogo real o semilla demo).
   ========================================================= */
const BRAND = 'SOAPBRXND';
const PHASE_STATUS = { abierto: 'available', anunciado: 'coming', llave: 'locked', agotado: 'soldout', archivo: 'soldout' };
const PHASE_LABEL = { abierto: 'GIRANDO', anunciado: 'PRONTO', llave: 'CON LLAVE', agotado: 'AGOTADO', archivo: 'ARCHIVO' };
let DROPS = [];
let ITEMS_DATA = [];
let ARTS = [];
function applyData(d) {
  DROPS = d.washers.map(w => ({ id: w.slug, n: w.number, name: w.name, phase: w.phase, status: PHASE_STATUS[w.phase] || 'locked', date: w.opensAt, href: w.href }));
  ITEMS_DATA = d.items;
  ARTS = d.artworks;
}
const ROOT = document.getElementById('lavanderia');
/* ========================================================= */
const LW = 320, LH = 256, COLS = 9, ROWS = 9, OX = 160, OY = 92, WALL = 78;
const $ = s => document.querySelector(s);
const store = {
  get(k, d) { try { const v = localStorage.getItem('sbx_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('sbx_' + k, JSON.stringify(v)); } catch (e) {} },
};
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- pixel primitives ---------------- */
function P(cx, cy, z = 0) { return [OX + (cx - cy) * 16, OY + (cx + cy) * 8 - z]; }
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
function fillPoly(g, pts, col) {
  g.fillStyle = col;
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = Math.floor(minY); y < Math.ceil(maxY); y++) {
    const sy = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= sy && y2 > sy) || (y2 <= sy && y1 > sy)) xs.push(x1 + (sy - y1) * (x2 - x1) / (y2 - y1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.round(xs[k]), b = Math.round(xs[k + 1]);
      if (b > a) g.fillRect(a, y, b - a, 1);
    }
  }
}
function line(g, x0, y0, x1, y1, col) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  g.fillStyle = col;
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (let i = 0; i < 2000; i++) {
    g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
function L3(g, a, b, col) { line(g, a[0], a[1], b[0], b[1], col); }
function strokePoly(g, pts, col) { for (let i = 0; i < pts.length; i++) L3(g, pts[i], pts[(i + 1) % pts.length], col); }
function px(g, x, y, col, w = 1, h = 1) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); }
// visible faces of an iso box: top, front-left (y = y+d plane), front-right (x = x+w plane)
function isoBox(g, x, y, z, w, d, h, top, left, right, out) {
  const T = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const Lf = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const Rf = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
  fillPoly(g, Lf, left); fillPoly(g, Rf, right); fillPoly(g, T, top);
  if (out) { strokePoly(g, Lf, out); strokePoly(g, Rf, out); strokePoly(g, T, out); }
}
const yFace = (g, x0, x1, y, z0, z1, col) => fillPoly(g, [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)], col);
const xFace = (g, x, y0, y1, z0, z1, col) => fillPoly(g, [P(x, y0, z0), P(x, y1, z0), P(x, y1, z1), P(x, y0, z1)], col);

/* ---------------- 3x5 pixel font ---------------- */
const FONT = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4],
  G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [5, 7, 7, 7, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5],
  S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7], 0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [6, 1, 2, 4, 7], 3: [6, 1, 2, 1, 6],
  4: [5, 5, 7, 1, 1], 5: [7, 4, 6, 1, 6], 6: [3, 4, 7, 5, 7], 7: [7, 1, 1, 2, 2], 8: [7, 5, 7, 5, 7], 9: [7, 5, 7, 1, 6],
  ' ': [0, 0, 0, 0, 0], '-': [0, 0, 7, 0, 0], '·': [0, 0, 2, 0, 0], '.': [0, 0, 0, 0, 2], '!': [2, 2, 2, 0, 2], '?': [6, 1, 2, 0, 2], ':': [0, 2, 0, 2, 0],
};
function textPts(str) {
  str = str.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const pts = []; let x = 0;
  for (const ch of str) {
    const gl = FONT[ch] || FONT[' '];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (gl[r] & (4 >> c)) pts.push([x + c, r]);
    x += 4;
  }
  return { w: Math.max(0, x - 1), pts };
}
// skew: 0 flat, 1 = runs down-right (y-planes), -1 = runs up-right (x-planes)
function drawText(g, str, x, y, col, scale = 1, skew = 0) {
  const t = textPts(str); g.fillStyle = col; x = Math.round(x); y = Math.round(y);
  for (const [tx, ty] of t.pts) for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) {
    const X = tx * scale + a, Y = ty * scale + b;
    const gx = Math.floor(tx / 4) * 4 * scale; // letras rectas, línea base escalonada (más legible)
    g.fillRect(x + X, y + Y + (skew ? skew * Math.floor(gx / 2) : 0), 1, 1);
  }
  return t.w * scale;
}
function blit(g, rows, x, y, pal, skew = 0) {
  x = Math.round(x); y = Math.round(y);
  rows.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) {
    const col = pal[row[rx]]; if (!col) continue;
    g.fillStyle = col; g.fillRect(x + rx, y + ry + (skew ? skew * Math.floor(rx / 2) : 0), 1, 1);
  } });
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [f(r), f(gg), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}


/* ---------------- arte pixel de cada pieza (16x16) ---------------- */
const ART = {
  hoodie: ['....oooooooo....', '...obbbddbbbo...', '..obbbo..obbbo..', '.obbbbo..obbbbo.', 'obbbbbboobbbbbbo', 'obbbbbbbbbbbbbbo', 'obbobwbwbwbbobbo', 'obbobbwbwbwbobbo', 'obbobwbwbwbbobbo', 'obbobbwbwbwbobbo', 'obbobbbbbbbbobbo', 'oddobbbbbbbbobdo', 'oddobbbbbbbbobdo', '.oo.oddddddddo.oo', '....oooooooooo..'],
  tee: ['................', '....oo....oo....', '..oobboooobboo..', '.obbbbbbbbbbbbo.', 'obbwbbwbbwbbwbbo', 'obbobbbbbbbbobbo', '.ooobwbbwbbwooo.', '...obbbbbbbbo...', '...obwbbwbbwo...', '...obbbbbbbbo...', '...owbbwbbwbo...', '...obbbbbbbbo...', '...oddddddddo...', '...oooooooooo...'],
  beanie: ['................', '......oooo......', '.....owwwwo.....', '......oooo......', '....oobbbboo....', '...obwbbwbbwo...', '..obbbbbbbbbbo..', '..obwbbwbbwbbo..', '..obbbbbbbbbbo..', '..obbwbbwbbwbo..', '..oddddddddddo..', '..odwdwdwdwdwo..', '..oddddddddddo..', '...oooooooooo...'],
  print: ['................', '.oooooooooooooo.', '.owwwwwwwwwwwwo.', '.owbbwwbbwwbbwo.', '.owbbwwbbwwbbwo.', '.owwwbbwwbbwwwo.', '.owwwbbwwbbwwwo.', '.owbbwwbbwwbbwo.', '.owbbwwbbwwbbwo.', '.owwwbbwwbbwwwo.', '.owwwbbwwbbwwwo.', '.owwwwwwwwwwwwo.', '.oooooooooooooo.'],
  fabric: ['................', '..ooooooooooo...', '..obbwbbwbbwboo.', '..obbwbbwbbwbodo', '..obbwbbwbbwbodo', '..obbwbbwbbwbodo', '..obbwbbwbbwbodo', '..obbwbbwbbwbodo', '..obbwbbwbbwbodo', '..obbwbbwbbwboo.', '..ooooooooooo...'],
  scarf: ['.......oo.......', '......obbo......', '.....obwwbo.....', '....obwbbwbo....', '...obwbwwbwbo...', '..obwbwbbwbwbo..', '...obwbwwbwbo...', '....obwbbwbo....', '.....obwwbo.....', '......obbo......', '.......oo.......'],
};
const artCache = {};
function artURL(item) {
  if (artCache[item.slug]) return artCache[item.slug];
  const [c, g] = mk(16, 16);
  const rows = ART[item.sprite] || ART.tee, off = Math.floor((16 - rows.length) / 2);
  const base = item.sprite === 'print' || item.sprite === 'fabric' || item.sprite === 'scarf' ? (item.pattern.colors[0] || item.color) : item.color;
  const print = item.pattern.colors[1] || '#e8e0d0';
  blit(g, rows, 0, off, { o: '#050506', b: base, d: shade(base, -0.25), w: print === base ? shade(base, 0.5) : print });
  return (artCache[item.slug] = c.toDataURL());
}
/* Motivo de un arte a tamaño diminuto (cuadros de la pared de la sala). */
function motifSmall(spec, x, y) {
  switch (spec.motif) {
    case 'checker': return ((x >> 1) + (y >> 1)) % 2 === 0;
    case 'stripes': return x % 3 === 0;
    case 'dots': return x % 3 === 1 && y % 3 === 1;
    case 'waves': return (y + Math.round(Math.sin(x * 1.2))) % 3 === 0;
    case 'grain': return ((x * 7 + y * 13) % 11) === 0;
    case 'weave': return y % 3 === 0 || x % 4 === 2;
    default: { const dx = (x % 6) - 2.5, dy = (y % 6) - 2.5, d = Math.hypot(dx, dy); return d > 1.3 && d < 2.4; }
  }
}
/* Muestra pixel de un arte (patrón, textura o textil). */
function swatchURL(art) {
  const [c, g] = mk(24, 24); const [a, b = '#e8e0d0', cc = b] = art.pattern.colors;
  g.fillStyle = a; g.fillRect(0, 0, 24, 24); g.fillStyle = b;
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    let on = false;
    switch (art.pattern.motif) {
      case 'checker': on = ((x >> 2) + (y >> 2)) % 2 === 0; break;
      case 'stripes': on = x % 6 < 2; break;
      case 'dots': on = x % 6 === 2 && y % 6 === 2; break;
      case 'waves': on = (y + Math.round(Math.sin(x / 2) * 1.5)) % 6 === 0; break;
      case 'grain': on = ((x * 7 + y * 13) % 17) === 0; break;
      case 'loops': { const dx = (x % 8) - 3.5, dy = (y % 8) - 3.5, d = Math.hypot(dx, dy); on = d > 1.6 && d < 2.8; break; }
      case 'weave': on = (y % 6 < 2) || (x % 6 === 4); break;
      case 'bubbles': { const dx = (x % 12) - 5.5, dy = (y % 12) - 5.5, d = Math.hypot(dx, dy); on = d > 2.6 && d < 3.8; if (on && (x + y) % 3 === 0) g.fillStyle = cc; else g.fillStyle = b; break; }
    }
    if (on) g.fillRect(x, y, 1, 1);
  }
  return c.toDataURL();
}
/* ---------------- icons (bitmaps) ---------------- */
const ICONS = {
  washer: ['#########', '#.#.#...#', '#########', '#..###..#', '#.#...#.#', '#.#.#.#.#', '#.#...#.#', '#..###..#', '#########'],
  hanger: ['....##...', '...#..#..', '......#..', '.....#...', '....#....', '...#.#...', '..#...#..', '.#.....#.', '#########'],
  key: ['.........', '.###.....', '#...#....', '#...######', '#...#.#.#', '.###.....', '.........'],
  frame: ['#########', '#.......#', '#.#####.#', '#.#...#.#', '#.#.#.#.#', '#.#####.#', '#.......#', '#########'],
  book: ['#########', '#...#...#', '#.#.#.#.#', '#...#...#', '#.#.#.#.#', '#...#...#', '#########'],
  mail: ['#########', '##.....##', '#.#...#.#', '#..#.#..#', '#...#...#', '#.......#', '#########'],
  truck: ['######...', '#....#...', '#....####.', '#....#..#', '#....#...#', '##########', '.##....##.'],
  back: ['...#.....', '..##.....', '.#######.', '..##....#', '...#....#', '........#', '..######.'],
  grid: ['###.###', '###.###', '###.###', '.......', '###.###', '###.###', '###.###'],
  bag: ['..###..', '.#...#.', '.#...#.', '#######', '#.....#', '#.#.#.#', '#.....#', '#######'],
};
function iconURL(name, col = '#f2f0eb') {
  const rows = ICONS[name]; const w = Math.max(...rows.map(r => r.length)), h = rows.length, s = Math.max(w, h);
  const [c, g] = mk(s, s);
  blit(g, rows, Math.floor((s - w) / 2), Math.floor((s - h) / 2), { '#': col });
  return c.toDataURL();
}


/* ---------------- Pompa (la mascota) ---------------- */
const SKINS = {
  iris: { name: 'Iris', base: '#d9ecff', dark: '#a9c4ea', line: '#2b2540' },
  menta: { name: 'Menta', base: '#cff6e2', dark: '#93d6b5', line: '#1f3a2f' },
  rosa: { name: 'Rosa', base: '#ffd9e9', dark: '#efa8c6', line: '#4a2238' },
  humo: { name: 'Humo', base: '#d3d3da', dark: '#9d9daa', line: '#25252c' },
  noche: { name: 'Noche', base: '#3c3c58', dark: '#28283d', line: '#0b0b12' },
};
const FACES = { none: 'Nada', shades: 'Gafas' };
const WEAR_COLORS = { hoodie: '#1a1a1e', tee: '#e8e0d0', beanie: '#b9a3f5', cap: '#2a2a30' };
const IRI = ['#9be7ff', '#c9a7ff', '#ffb3d9'];

const spriteCache = new Map();
function pompaSprite(o, frame = 0, facing = 1) {
  const key = [o.skin, o.top, o.topColor, o.head, o.headColor, o.face, frame, facing].join('|');
  if (spriteCache.has(key)) return spriteCache.get(key);
  const [c, g] = mk(22, 28);
  const sk = SKINS[o.skin] || SKINS.iris;
  const cx = 11, cy = 14, r = 8, f = facing > 0 ? 1 : -1;
  // feet
  const footY = cy + r - 1;
  const lUp = frame === 1 ? 1 : 0, rUp = frame === 2 ? 1 : 0;
  px(g, cx - 5, footY - lUp, sk.line, 4, 3); px(g, cx + 1, footY - rUp, sk.line, 4, 3);
  px(g, cx - 4, footY - lUp, shade(sk.base, -0.15), 2, 1); px(g, cx + 2, footY - rUp, shade(sk.base, -0.15), 2, 1);
  // body
  const topCol = o.top !== 'none' ? (o.topColor || WEAR_COLORS[o.top]) : null;
  const headCol = o.head !== 'none' ? (o.headColor || WEAR_COLORS[o.head]) : null;
  for (let y = 0; y < 28; y++) for (let x = 0; x < 22; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d > r) continue;
    let col;
    if (d > r - 1.1) col = sk.line;
    else {
      col = (dx + dy > 4.5) ? sk.dark : sk.base;
      if (d > r - 2.1) { const a = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI); col = IRI[Math.floor(a * 6) % 3]; if (dx + dy > 4.5) col = shade(col, -0.2); }
      if (d > 3.2 && d < 5.3 && dx < -1 && dy < -1.5) col = '#ffffff';
      if (topCol && dy > (o.top === 'tee' ? 2.5 : 1.5)) {
        col = (dx + dy > 4.5) ? shade(topCol, -0.3) : topCol;
        if (Math.floor(dy) === (o.top === 'tee' ? 2 : 1)) col = shade(topCol, topCol === '#e8e0d0' ? -0.2 : 0.18);
      }
      if (headCol && dy < -3.5) {
        col = (dx + dy > 2) ? shade(headCol, -0.25) : headCol;
        if (Math.floor(dy) === -4) col = shade(headCol, -0.35);
      }
    }
    px(g, x, y, col);
  }
  // hoodie strings / prints
  if (o.top === 'hoodie') { px(g, cx - 2 + f, cy + 3, '#e8e0d0', 1, 2); px(g, cx + 1 + f, cy + 3, '#e8e0d0', 1, 2); }
  if (o.top === 'tee') { px(g, cx - 1 + f, cy + 4, '#1a1a1e', 2, 2); }
  // head wear extras
  if (o.head === 'beanie') { px(g, cx - 1, cy - r - 2, '#f2f0eb', 3, 2); px(g, cx - 1, cy - r - 2, sk.line, 3, 1); }
  if (o.head === 'cap') { const bx = f > 0 ? cx + 4 : cx - 9; px(g, bx, cy - 4, sk.line, 5, 1); px(g, bx, cy - 3, shade(o.headColor || WEAR_COLORS.cap, 0.2), 5, 1); px(g, cx - 1, cy - 2 - 4, '#9be7ff', 2, 1); }
  // eyes
  const ex = cx + (f > 0 ? 1 : -2);
  if (o.face === 'shades') { px(g, ex - 4, cy - 2, '#070707', 9, 2); px(g, ex - 3, cy - 2, '#9be7ff', 1, 1); px(g, ex + 2, cy - 2, '#9be7ff', 1, 1); }
  else { const eh = frame === 3 ? 1 : 2, ey = cy - 2 + (frame === 3 ? 1 : 0); px(g, ex - 3, ey, '#111', 1, eh); px(g, ex + 2, ey, '#111', 1, eh); }
  // floating mini bubble (antenna)
  if (o.head === 'none') {
    const bx = cx + 5 * f, by = cy - r - 3;
    px(g, bx - 1, by - 2, sk.line, 3, 1); px(g, bx - 1, by + 2, sk.line, 3, 1); px(g, bx - 2, by - 1, sk.line, 1, 3); px(g, bx + 2, by - 1, sk.line, 1, 3);
    px(g, bx - 1, by - 1, '#ffffff', 1, 1); px(g, bx, by, IRI[1], 2, 2);
  }
  spriteCache.set(key, c);
  return c;
}

/* ---------------- Daniel (pastilla de jabón) ---------------- */
function danielSprite(frame = 0) {
  const key = 'daniel' + frame;
  if (spriteCache.has(key)) return spriteCache.get(key);
  const [c, g] = mk(20, 26);
  const base = '#f6c9d6', dark = '#e29cb5', line = '#4a2236', top = '#fde3ea';
  // bar body (rounded rectangle 16x22)
  for (let y = 2; y < 25; y++) for (let x = 2; x < 18; x++) {
    const corner = (x < 4 || x > 15) && (y < 4 || y > 22);
    const edge = x === 2 || x === 17 || y === 2 || y === 24;
    if (corner && ((x === 2 || x === 17) && (y === 2 || y === 24))) continue;
    let col = x > 13 ? dark : base;
    if (y < 5) col = top;
    if (edge || (corner && (x === 3 || x === 16) && (y === 3 || y === 23))) col = line;
    px(g, x, y, col);
  }
  // engraved S
  [[7, 15], [8, 15], [9, 15], [6, 16], [7, 17], [8, 17], [9, 18], [6, 19], [7, 19], [8, 19]].forEach(([x, y]) => px(g, x + 1, y, dark));
  // face
  const blink = frame === 3;
  px(g, 6, 8, line, 1, blink ? 1 : 2); px(g, 12, 8, line, 1, blink ? 1 : 2);
  px(g, 8, 11, line, 3, 1); px(g, 7, 10, line, 1, 1); px(g, 11, 10, line, 1, 1);
  px(g, 4, 10, '#ff9fbd', 2, 1); px(g, 14, 10, '#ff9fbd', 2, 1);
  // arms
  const wave = frame === 1 || frame === 2;
  px(g, 0, wave ? 9 : 14, line, 2, 1); px(g, 0, wave ? 10 : 15, base, 2, 2);
  px(g, 18, 14, line, 2, 1); px(g, 18, 15, dark, 2, 2);
  // shine
  px(g, 4, 6, '#ffffff', 2, 1); px(g, 4, 7, '#ffffff', 1, 1);
  spriteCache.set(key, c);
  return c;
}

/* ---------------- room background ---------------- */
function buildBG() {
  const [c, g] = mk(LW, LH);
  const TB = 34;
  fillPoly(g, [P(0, 0, 0), P(COLS, 0, 0), P(COLS, 0, WALL), P(0, 0, WALL)], '#27272c');
  fillPoly(g, [P(0, 0, 0), P(0, ROWS, 0), P(0, ROWS, WALL), P(0, 0, WALL)], '#1d1d22');
  for (let t = 1; t < COLS; t++) L3(g, P(t, 0, TB + 2), P(t, 0, WALL - 1), '#2f2f35');
  for (let t = 1; t < ROWS; t++) L3(g, P(0, t, TB + 2), P(0, t, WALL - 1), '#232328');
  // tiled lower band
  fillPoly(g, [P(0, 0, 0), P(COLS, 0, 0), P(COLS, 0, TB), P(0, 0, TB)], '#ebe8e1');
  fillPoly(g, [P(0, 0, 0), P(0, ROWS, 0), P(0, ROWS, TB), P(0, 0, TB)], '#d4d0c7');
  for (let z = 7; z < TB; z += 7) { L3(g, P(0, 0, z), P(COLS, 0, z), '#d3cdc1'); L3(g, P(0, 0, z), P(0, ROWS, z), '#bfb9ad'); }
  for (let t = 0.5; t < COLS; t += 0.5) L3(g, P(t, 0, 0), P(t, 0, TB), '#d3cdc1');
  for (let t = 0.5; t < ROWS; t += 0.5) L3(g, P(0, t, 0), P(0, t, TB), '#bfb9ad');
  L3(g, P(0, 0, TB), P(COLS, 0, TB), '#8f897d'); L3(g, P(0, 0, TB), P(0, ROWS, TB), '#7a756b');
  L3(g, P(0, 0, TB + 1), P(COLS, 0, TB + 1), '#121215'); L3(g, P(0, 0, TB + 1), P(0, ROWS, TB + 1), '#0e0e11');
  L3(g, P(0, 0, 0), P(0, 0, WALL), '#111114');
  // wall caps + ends
  fillPoly(g, [P(0, 0, WALL), P(COLS, 0, WALL), P(COLS, -0.25, WALL), P(-0.25, -0.25, WALL), P(-0.25, ROWS, WALL), P(0, ROWS, WALL)], '#e8e0d0');
  fillPoly(g, [P(0, ROWS, -6), P(-0.25, ROWS, -6), P(-0.25, ROWS, WALL), P(0, ROWS, WALL)], '#a99f8c');
  fillPoly(g, [P(COLS, 0, -6), P(COLS, -0.25, -6), P(COLS, -0.25, WALL), P(COLS, 0, WALL)], '#c9bfac');
  // floor thickness
  fillPoly(g, [P(0, ROWS, 0), P(COLS, ROWS, 0), P(COLS, ROWS, -6), P(0, ROWS, -6)], '#121215');
  fillPoly(g, [P(COLS, 0, 0), P(COLS, ROWS, 0), P(COLS, ROWS, -6), P(COLS, 0, -6)], '#1c1c21');
  // checker floor (laundromat)
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const dark = (x + y) % 2 === 1;
    fillPoly(g, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], dark ? '#1d1d21' : '#ebe5d9');
  }
  // --- luz y volumen ---
  // brillo en el canto de cada baldosa
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const hi = (x + y) % 2 === 1 ? '#2c2c33' : '#f9f5ec';
    L3(g, P(x, y), P(x + 1, y), hi); L3(g, P(x, y), P(x, y + 1), hi);
  }
  // sombra de las paredes sobre el suelo
  fillPoly(g, [P(0, 0), P(COLS, 0), P(COLS, 0.45), P(0.45, 0.45), P(0.45, ROWS), P(0, ROWS)], 'rgba(0,0,0,.10)');
  fillPoly(g, [P(0, 0), P(COLS, 0), P(COLS, 0.18), P(0.18, 0.18), P(0.18, ROWS), P(0, ROWS)], 'rgba(0,0,0,.14)');
  // sombra de contacto de cada mueble (la luz viene del fondo izquierdo)
  ITEMS.filter(i => !i.wall).forEach(i => {
    const [x0, y0, x1, y1] = i.box;
    fillPoly(g, [P(x0, y0), P(x1 + 0.34, y0 + 0.1), P(x1 + 0.34, y1 + 0.34), P(x0 + 0.1, y1 + 0.34)], 'rgba(0,0,0,.16)');
    fillPoly(g, [P(x0, y0), P(x1 + 0.14, y0), P(x1 + 0.14, y1 + 0.14), P(x0, y1 + 0.14)], 'rgba(0,0,0,.2)');
  });
  // foco cálido en el centro y viñeta hacia los bordes del suelo
  const [fcx, fcy] = P(4.6, 4.8);
  for (let y = OY - 2; y < OY + (COLS + ROWS) * 8 + 2; y++) for (let x = 0; x < LW; x++) {
    if (!tileAt(x + 0.5, y + 0.5)) continue;
    const d = Math.hypot((x - fcx) / 120, (y - fcy) / 62);
    if (d < 0.75) { if ((x + y) % 2 === 0) px(g, x, y, `rgba(255,240,205,${(0.14 * (1 - d / 0.75)).toFixed(3)})`); }
    else px(g, x, y, `rgba(0,0,0,${Math.min(0.28, (d - 0.75) * 0.55).toFixed(3)})`);
  }
  // paredes más oscuras hacia el techo
  for (let i = 0; i < 5; i++) {
    const z0 = TB + 4 + i * 9;
    fillPoly(g, [P(0, 0, z0), P(COLS, 0, z0), P(COLS, 0, WALL), P(0, 0, WALL)], 'rgba(0,0,0,.055)');
    fillPoly(g, [P(0, 0, z0), P(0, ROWS, z0), P(0, ROWS, WALL), P(0, 0, WALL)], 'rgba(0,0,0,.055)');
  }
  // halo del neón sobre la pared izquierda
  for (let i = 0; i < 3; i++) fillPoly(g, [P(0, 3.7 + i * 0.25, 58 - i * 4), P(0, 1.0 - i * 0.25, 58 - i * 4), P(0, 1.0 - i * 0.25, WALL - 1), P(0, 3.7 + i * 0.25, WALL - 1)], 'rgba(155,231,255,.05)');
  // logo on right wall
  let [lx, ly] = P(4.25, 0, 72);
  drawText(g, BRAND, lx + 1, ly + 1, '#0b0b0d', 2, 1);
  drawText(g, BRAND, lx, ly, '#f2f0eb', 2, 1);
  [lx, ly] = P(4.3, 0, 56);
  drawText(g, 'LAVANDERIA · 24H', lx, ly, '#c9b99a', 1, 1);
  // little bubbles painted on the right wall
  [[2.2, 64], [2.9, 70], [3.5, 61]].forEach(([t, z], i) => {
    const [bx, by] = P(t, 0, z); const r = 2 + (i % 2);
    for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; px(g, bx + Math.round(Math.cos(an) * r), by + Math.round(Math.sin(an) * r) + Math.floor(Math.cos(an) * r / 2), IRI[i]); }
  });
  return c;
}

/* ---------------- furniture ---------------- */
const ITEMS = [];
function item(o) { o.nf = o.nf || 1; ITEMS.push(o); return o; }
const BLACK = ['#2f2f35', '#1b1b1f', '#121215', '#050506'];

function porthole(g, cx, cy, status, f) {
  const R = 7, r = 5;
  for (let u = -R; u <= R; u++) for (let v = -R; v <= R; v++) {
    const d2 = u * u + v * v; if (d2 > R * R + 2) continue;
    const X = cx + u, Y = cy + v + Math.floor(u / 2);
    let col;
    if (d2 > (r + 0.6) * (r + 0.6)) col = (u + v < -4) ? '#62626c' : '#3a3a42';
    else if (status === 'available') {
      const ang = Math.atan2(v, u) + f * Math.PI / 4;
      const sec = Math.floor((((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2));
      col = ['#1a1a1e', '#e8e0d0', '#b9a3f5', '#9be7ff'][sec];
      if (d2 <= 2) col = '#d7eaf4';
    } else if (status === 'coming') col = (v > 1) ? '#7fb3c9' : '#1e2a33';
    else col = '#141417';
    px(g, X, Y, col);
  }
  px(g, cx - 2, cy - 3 - 1, 'rgba(255,255,255,.75)', 2, 1);
  if (status === 'coming') { // water + bubbles
    [[-2, 2 - (f % 2)], [1, 1 + (f % 2)], [3, 3]].forEach(([u, v]) => px(g, cx + u, cy + v + Math.floor(u / 2), '#d7f3ff'));
  }
  if (status === 'locked') { // padlock
    px(g, cx - 2, cy - 5, '#ffd36b', 1, 3); px(g, cx + 2, cy - 5, '#ffd36b', 1, 3); px(g, cx - 1, cy - 6, '#ffd36b', 3, 1);
    px(g, cx - 3, cy - 2, '#ffd36b', 7, 5); px(g, cx - 3, cy + 2, '#c9993a', 7, 1); px(g, cx, cy - 1, '#141417', 1, 2);
  }
}
function drawWasher(g, tx, drop, f) {
  const x = tx + 0.08, y = 0.08, w = 0.84, d = 0.84, h = 28;
  const shake = drop.status === 'available' && f % 2 ? 1 : 0;
  g.save(); g.translate(0, -shake);
  isoBox(g, x, y, 0, w, d, h, '#f7f5f0', '#e3dfd5', '#c6c1b5', '#26262b');
  yFace(g, x + 0.04, x + w - 0.04, y + d, 21, 26, '#2e2e34');
  let [sx, sy] = P(x + 0.1, y + d, 25.5);
  drawText(g, drop.n, sx, sy, '#f2f0eb', 1, 1);
  const led = { available: '#8ff0a4', coming: '#ffd36b', locked: '#ff6b6b', unlocked: '#9be7ff' }[drop.status] || '#ff6b6b';
  [sx, sy] = P(x + w - 0.16, y + d, 24);
  px(g, sx, sy, (f % 2 || drop.status === 'available') ? led : shade(led, -0.5), 2, 1);
  const [cx, cy] = P(x + w / 2, y + d, 11);
  porthole(g, Math.round(cx), Math.round(cy), drop.status === 'unlocked' ? 'coming' : drop.status, f);
  if (drop.status === 'coming') { // caution tape
    for (let u = 0; u < 15; u++) { const [tx2, ty2] = P(x + 0.02 + u / 16.5, y + d, 4); px(g, tx2, ty2, (Math.floor(u / 2) % 2) ? '#141417' : '#ffd36b', 1, 3); }
  }
  // detergent on top
  if (drop.n === '01') isoBox(g, x + 0.5, y + 0.15, h, 0.22, 0.2, 6, '#9be7ff', '#6fc4e0', '#58a9c5', '#1d3b47');
  g.restore();
}
function addWasher(tx, drop) {
  item({ id: 'washer' + drop.n, label: 'LAVADORA ' + drop.n + ' · ' + (drop.status === 'locked' ? '???' : drop.name),
    box: [tx + 0.08, 0.08, tx + 0.92, 0.92], blocks: [[tx, 0]], use: [tx, 1], nf: 4, fps: drop.status === 'available' ? 8 : 3,
    draw: (g, f) => drawWasher(g, tx, drop, f), act: () => openDrop(drop.id), drop, tag: tx === 2 || DROPS.length < 2 ? 'DROPS' : null });
}

function buildItems() {
  ITEMS.length = 0;
  // wall: door
  item({ id: 'door', wall: true, label: 'SALIDA · TIENDA CLÁSICA', box: [0, 6.9, 0.02, 8.4], blocks: [], use: [0, 7],
    draw: g => {
      fillPoly(g, [P(0.02, 8.35, 0), P(0.02, 6.95, 0), P(0.02, 6.95, 47), P(0.02, 8.35, 47)], '#e8e0d0');
      fillPoly(g, [P(0.02, 8.2, 0), P(0.02, 7.1, 0), P(0.02, 7.1, 44), P(0.02, 8.2, 44)], '#0a0a0c');
      for (let z = 6; z < 44; z += 9) L3(g, P(0.02, 8.2, z), P(0.02, 7.1, z), '#141418');
      const [sx, sy] = P(0.02, 8.2, 55);
      fillPoly(g, [P(0.02, 8.25, 49), P(0.02, 6.95, 49), P(0.02, 6.95, 56), P(0.02, 8.25, 56)], '#0e2416');
      drawText(g, 'SALIDA', sx + 1, sy + 1, '#8ff0a4', 1, -1);
    }, act: () => openPanel('SALIDA', `<p>¿Prefieres la tienda sin sala? Todo lo de aquí está también en páginas normales.</p><div class="row"><a class="pbtn" href="/drops">DROPS</a><a class="pbtn" href="/artes">ARTES</a><button class="pbtn ghost" data-act="close">ME QUEDO</button></div>`) });
  // wall: archive board
  item({ id: 'board', wall: true, label: 'ARTES · PATRONES, TEXTURAS Y TEXTILES', box: [0, 4, 0.02, 6], blocks: [], use: [1, 5],
    draw: g => {
      fillPoly(g, [P(0.02, 6.05, 27), P(0.02, 3.95, 27), P(0.02, 3.95, 59), P(0.02, 6.05, 59)], '#3a2a1c');
      fillPoly(g, [P(0.02, 5.95, 29), P(0.02, 4.05, 29), P(0.02, 4.05, 57), P(0.02, 5.95, 57)], '#9c7148');
      // seis muestras enmarcadas con el motivo real de cada arte
      const slots = [[5.88, 57], [5.22, 57], [4.56, 57], [5.88, 43], [5.22, 43], [4.56, 43]];
      slots.forEach(([t, z], i) => {
        const art = ARTS[i]; const [sx0, sy0] = P(0.02, t, z); const W = 9, H = 12;
        for (let u = 0; u < W; u++) for (let v = 0; v < H; v++) {
          const X = Math.round(sx0) + u, Y = Math.round(sy0) + v - Math.floor(u / 2);
          const frame = u === 0 || v === 0 || u === W - 1 || v === H - 1;
          let col = '#f2f0eb';
          if (!frame && art) col = motifSmall(art.pattern, u - 1, v - 1) ? (art.pattern.colors[1] || '#e8e0d0') : art.pattern.colors[0];
          if (!frame && !art) col = '#b08a63';
          px(g, X, Y, col);
        }
        px(g, Math.round(sx0) + 4, Math.round(sy0) - 3, '#ff6b6b');
      });
      const [sx, sy] = P(0.02, 5.85, 66); drawText(g, 'ARTES', sx, sy, '#e8e0d0', 1, -1);
    }, act: () => openArtworks() });
  // wall: neon (decor, animated)
  item({ id: 'neon', wall: true, box: [0, 1.4, 0.02, 3.4], blocks: [], nf: 2, fps: 1.4,
    draw: (g, f) => { const [sx, sy] = P(0.02, 3.3, 72); const col = f ? '#9be7ff' : '#c9f3ff';
      drawText(g, 'ABIERTO', sx + 1, sy + 1, f ? '#1b4a59' : '#2c6577', 1, -1); drawText(g, 'ABIERTO', sx, sy, col, 1, -1); } });
  // plant (corner)
  item({ id: 'plant', box: [0.2, 0.2, 0.8, 0.8], blocks: [[0, 0]],
    draw: g => {
      isoBox(g, 0.28, 0.28, 0, 0.44, 0.44, 10, '#3a3a40', '#232327', '#1a1a1e', '#050506');
      const [cx, cy] = P(0.5, 0.5, 22);
      const leaves = [[0, -10, 4, 3], [-5, -6, 5, 3], [5, -6, 5, 3], [-3, -1, 6, 3], [4, 0, 5, 3], [0, -4, 4, 6], [-6, 2, 4, 2], [6, 3, 4, 2]];
      leaves.forEach(([dx, dy, w, h], i) => { px(g, cx + dx - w / 2, cy + dy, i % 2 ? '#3f8f5a' : '#57b878', w, h); px(g, cx + dx - w / 2, cy + dy, '#1d4a2c', w, 1); });
      px(g, cx - 1, cy - 4, '#2c6b40', 2, 14);
    } });
  // washers = drops
  DROPS.filter(d => !d.hidden).forEach((d, i) => addWasher(1 + i, d));
  // vestidor booth
  item({ id: 'booth', label: 'VESTIDOR · VISTE A POMPA', box: [0.05, 0.95, 0.95, 2.95], blocks: [[0, 1], [0, 2]], use: [1, 2],
    draw: g => {
      isoBox(g, 0.05, 0.95, 0, 0.9, 2, 56, '#3a3a42', '#202025', '#18181c', '#050506');
      xFace(g, 0.95, 1.12, 2.8, 2, 45, '#7a64c4');
      for (let t = 1.12; t < 2.8; t += 0.08) { const odd = Math.round((t - 1.12) / 0.08) % 2; L3(g, P(0.95, t, 2), P(0.95, t, 45), odd ? '#9a85e0' : '#6a55b2'); }
      L3(g, P(0.95, 1.1, 46), P(0.95, 2.82, 46), '#b0b0b8');
      const [sx, sy] = P(0.95, 2.86, 53.5); drawText(g, 'VESTIDOR', sx, sy, '#e8e0d0', 1, -1);
      yFace(g, 0.12, 0.88, 2.95, 30, 48, '#d9ecff'); // mirror on the side
      L3(g, P(0.3, 2.95, 44), P(0.42, 2.95, 40), '#ffffff');
    }, act: () => { hidePompa(700); setTimeout(() => openWardrobe(), 450); } });
  // counter + register
  item({ id: 'counter', tag: 'DANIEL', label: 'MOSTRADOR · HABLA CON DANIEL', box: [6, 2.1, 8.95, 2.9], blocks: [[6, 2], [7, 2], [8, 2]], use: [7, 3],
    draw: g => {
      isoBox(g, 6, 2.1, 0, 2.95, 0.8, 18, '#34343a', '#1a1a1e', '#111114', '#050506');
      [[6.4, 2.4], [6.9, 2.6], [7.4, 2.3], [7.9, 2.7], [8.5, 2.45]].forEach(([a, b]) => { const [vx, vy] = P(a, b, 18); px(g, vx, vy, '#5a5a62', 3, 1); });
      const [sx, sy] = P(6.35, 2.9, 12); drawText(g, BRAND, sx, sy, '#e8e0d0', 1, 1);
      isoBox(g, 8.1, 2.25, 18, 0.55, 0.45, 7, '#5c5c64', '#3a3a40', '#2b2b30', '#050506');
      const [rx, ry] = P(8.15, 2.7, 23); px(g, rx + 1, ry + 1, '#8ff0a4', 4, 1);
      isoBox(g, 6.35, 2.35, 18, 0.24, 0.24, 8, '#ffd9e9', '#efa8c6', '#d98aab', '#4a2238');
      const [nx, ny] = P(6.47, 2.47, 30); px(g, nx - 1, ny, '#4a2238', 3, 1); px(g, nx, ny + 1, '#4a2238', 1, 3);
    }, act: () => talkDaniel() });
  // clothes rack
  item({ id: 'rack', label: 'ROPA · VER PRODUCTOS', box: [1.85, 5.25, 4.95, 5.75], blocks: [[2, 5], [3, 5], [4, 5]], use: [3, 6],
    draw: g => {
      isoBox(g, 1.85, 5.28, 0, 0.4, 0.44, 2, ...BLACK);
      isoBox(g, 4.55, 5.28, 0, 0.4, 0.44, 2, ...BLACK);
      isoBox(g, 1.98, 5.42, 2, 0.14, 0.16, 34, ...BLACK);
      isoBox(g, 4.68, 5.42, 2, 0.14, 0.16, 34, ...BLACK);
      isoBox(g, 2.0, 5.45, 32, 2.82, 0.1, 2, '#77777f', '#4a4a52', '#36363c', '#050506');
      const cols = ITEMS_DATA.filter(x => ['hoodie', 'tee', 'beanie', 'scarf'].includes(x.sprite)).slice(0, 5).map(x => [x.color, x.pattern.colors[1] || '#e8e0d0']);
      while (cols.length < 5) cols.push(['#2a2a30', '#e8e0d0']);
      cols.forEach(([b, w], i) => {
        const gx = 2.35 + i * 0.52; const [hx, hy] = P(gx, 5.5, 33);
        px(g, hx, hy - 2, '#9a9aa2', 1, 2);
        blit(g, ['...o...', '..o.o..', '.ooooo.'], hx - 3, hy, { o: '#9a9aa2' });
        blit(g, ['.ooo.ooo.', 'obbbobbbo', 'obbbbbbbo', 'oobbwbboo', '..obbbo..', '..obbbo..', '..obbbo..', '..obbbo..', '..ooooo..'],
          hx - 4, hy + 2, { o: '#050506', b, w }, 1);
      });
      isoBox(g, 2.85, 5.45, 36, 1.1, 0.08, 9, '#121215', '#0b0b0d', '#08080a', '#e8e0d0');
      const [sx, sy] = P(3.0, 5.53, 43.5); drawText(g, 'ROPA', sx, sy, '#f2f0eb', 1, 1);
    }, act: () => openCatalog() });
  // bench with laundry basket
  item({ id: 'bench', label: 'BANCO DE ESPERA', tag: null, box: [7.95, 5.0, 8.9, 7.9], blocks: [[8, 5], [8, 6], [8, 7]], use: [7, 6],
    draw: g => {
      [[8.05, 5.1], [8.65, 5.1], [8.05, 7.6], [8.65, 7.6]].forEach(([a, b]) => isoBox(g, a, b, 0, 0.12, 0.12, 8, ...BLACK));
      isoBox(g, 7.95, 5.0, 8, 0.9, 2.9, 3, '#c9b99a', '#a8987a', '#8c7d62', '#2a2118');
      isoBox(g, 8.15, 6.75, 11, 0.6, 0.65, 7, '#f2f0eb', '#d9d2c3', '#c2baa9', '#3a3328');
      const [bx, by] = P(8.45, 7.05, 18);
      px(g, bx - 5, by - 2, '#b9a3f5', 4, 2); px(g, bx - 1, by - 3, '#1a1a1e', 4, 3); px(g, bx + 3, by - 2, '#9be7ff', 3, 2);
    }, act: () => say(pompa, ['Esperando a que acabe el centrifugado…', 'Huele a suavizante.', 'Un día me pruebo la 03.'][Math.floor(Math.random() * 3)]) });
}

/* ---------------- characters ---------------- */
const outfit = Object.assign({ skin: 'iris', top: 'none', topColor: null, topSlug: null, head: 'none', headColor: null, headSlug: null, face: 'none' }, store.get('outfit2', {}));
const pompa = { id: 'pompa', name: () => nick, x: 0.5, y: 7.5, path: [], facing: 1, frame: 0, ft: 0, speed: 3.2, hidden: 0, onArrive: null };
const daniel = { id: 'daniel', name: () => 'DANIEL', x: 7.5, y: 1.05, facing: -1, frame: 0, ft: 0, path: [], static: true };
const CHARS = [pompa, daniel];
let nick = store.get('nick', 'INVITADO');

const blocked = new Set();
function rebuildBlocked() {
  blocked.clear();
  ITEMS.forEach(it => (it.blocks || []).forEach(([x, y]) => blocked.add(x + ',' + y)));
  for (let x = 5; x < 9; x++) for (let y = 0; y < 2; y++) blocked.add(x + ',' + y); // detrás del mostrador
}
const free = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !blocked.has(x + ',' + y);
function findPath(sx, sy, tx, ty) {
  if (!free(tx, ty)) return null;
  const key = (x, y) => x + ',' + y, prev = new Map([[key(sx, sy), null]]), dist = new Map([[key(sx, sy), 0]]);
  const open = [[sx, sy]];
  while (open.length) {
    open.sort((a, b) => dist.get(key(...a)) - dist.get(key(...b)));
    const [x, y] = open.shift();
    if (x === tx && y === ty) break;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue;
      const nd = dist.get(key(x, y)) + (dx && dy ? 1.41 : 1);
      if (!dist.has(key(nx, ny)) || nd < dist.get(key(nx, ny))) { dist.set(key(nx, ny), nd); prev.set(key(nx, ny), [x, y]); open.push([nx, ny]); }
    }
  }
  if (!prev.has(key(tx, ty))) return null;
  const path = []; let cur = [tx, ty];
  while (cur && !(cur[0] === sx && cur[1] === sy)) { path.unshift([cur[0] + 0.5, cur[1] + 0.5]); cur = prev.get(key(...cur)); }
  return path;
}
function walkTo(tx, ty, onArrive) {
  const c = pompa;
  const start = c.path.length ? c.path[0] : [c.x, c.y];
  const sx = Math.floor(start[0]), sy = Math.floor(start[1]);
  const route = findPath(sx, sy, tx, ty);
  if (!route) return false;
  c.path = c.path.length ? [c.path[0], ...route] : route;
  c.onArrive = onArrive || null;
  if (!c.path.length && onArrive) { c.onArrive = null; onArrive(); }
  return true;
}
function faceToward(c, wx, wy) { const sdx = (wx - c.x) - (wy - c.y); if (Math.abs(sdx) > 0.01) c.facing = sdx > 0 ? 1 : -1; }
function goUse(it) {
  const [ux, uy] = it.use;
  const done = () => { faceToward(pompa, (it.box[0] + it.box[2]) / 2, (it.box[1] + it.box[3]) / 2); it.act(); };
  if (Math.floor(pompa.x) === ux && Math.floor(pompa.y) === uy && !pompa.path.length) done();
  else if (!walkTo(ux, uy, done)) it.act();
}
function hidePompa(ms) { pompa.hidden = performance.now() + ms; burst(pompa, 8); }

/* ---------------- speech bubbles ---------------- */
const saysEl = $('#says');
const bubbles = [];
function say(c, text, ms = 5200) {
  const el = document.createElement('div');
  el.className = 'say';
  el.innerHTML = `<b>${esc(c.name())}:</b>${esc(text)}`;
  saysEl.appendChild(el);
  const b = { c, el, until: performance.now() + ms };
  bubbles.push(b);
  while (bubbles.filter(x => x.c === c).length > 3) { const old = bubbles.find(x => x.c === c); old.el.remove(); bubbles.splice(bubbles.indexOf(old), 1); }
  return b;
}

/* ---------------- particles (soap bubbles) ---------------- */
const parts = [];
function spawnBubble(x, y, r) { parts.push({ x, y, r: r || 1 + Math.floor(Math.random() * 3), t: 0, life: 2.5 + Math.random() * 2.5, ph: Math.random() * 6, col: IRI[Math.floor(Math.random() * 3)], vy: 6 + Math.random() * 8 }); }
function burst(c, n) { const [sx, sy] = P(c.x, c.y); for (let i = 0; i < n; i++) spawnBubble(sx - 6 + Math.random() * 12, sy - 10 - Math.random() * 10); }
function drawBubble(g, b) {
  const x = Math.round(b.x + Math.sin(b.t * 2 + b.ph) * 2), y = Math.round(b.y);
  if (b.t > b.life - 0.15) { px(g, x - 2, y, b.col); px(g, x + 2, y, b.col); px(g, x, y - 2, b.col); px(g, x, y + 2, b.col); return; }
  const r = b.r;
  if (r === 1) { px(g, x - 1, y, b.col); px(g, x + 1, y, b.col); px(g, x, y - 1, b.col); px(g, x, y + 1, b.col); return; }
  for (let a = 0; a < 12 + r * 4; a++) { const an = a / (12 + r * 4) * Math.PI * 2; px(g, x + Math.round(Math.cos(an) * r), y + Math.round(Math.sin(an) * r), b.col); }
  px(g, x - Math.ceil(r / 2), y - Math.ceil(r / 2), '#ffffff');
}

/* ---------------- render ---------------- */
const room = $('#room'), g = room.getContext('2d');
g.imageSmoothingEnabled = false;
let BG;
let hoverTile = null, hoverItem = null;
let drawOrder = [];

const tagsEl = $('#tags'); let tagKey = '';
function buildTags() {
  tagsEl.innerHTML = '';
  ITEMS.forEach(it => {
    if (!it.act || it.tag === null) return;
    const el = document.createElement('span');
    // Los muebles con rótulo pintado solo enseñan la etiqueta al pasar por encima.
    el.className = 'ftag' + (['door', 'board', 'booth', 'rack'].includes(it.id) ? ' quiet' : ''); el.textContent = it.tag || it.label.split(' · ')[0];
    tagsEl.appendChild(el); it.tagEl = el;
  });
  tagKey = '';
}
function placeTags() {
  const key = cam.x + ',' + cam.y + ',' + cam.s + ',' + (hoverItem ? hoverItem.id : '');
  if (key === tagKey) return; tagKey = key;
  ITEMS.forEach(it => {
    if (!it.tagEl) return;
    it.tagEl.style.left = (cam.x + (it.bb[0] + it.bb[2]) / 2 * cam.s) + 'px';
    it.tagEl.style.top = (cam.y + it.bb[1] * cam.s - 6) + 'px';
    it.tagEl.classList.toggle('on', hoverItem === it);
  });
}
function prerender() {
  ITEMS.forEach(it => {
    it.frames = [];
    for (let f = 0; f < it.nf; f++) { const [c, cg] = mk(LW, LH); it.draw(cg, f); it.frames.push(c); }
    const data = it.frames[0].getContext('2d').getImageData(0, 0, LW, LH).data;
    it.alpha = new Uint8Array(LW * LH);
    let x0 = LW, y0 = LH, x1 = 0, y1 = 0;
    for (let i = 0; i < LW * LH; i++) if (data[i * 4 + 3] > 0) { it.alpha[i] = 1; const x = i % LW, y = (i / LW) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    it.bb = [x0, y0, x1 + 1, y1 + 1];
    it.cur = 0;
  });
}
function charBB(c) { const [sx, sy] = P(c.x, c.y); return [sx - 11, sy - 28, sx + 11, sy + 3]; }
const overlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
function computeOrder() {
  const furn = ITEMS.filter(i => !i.wall).sort((a, b) => (a.box[0] + a.box[2] + a.box[1] + a.box[3]) - (b.box[0] + b.box[2] + b.box[1] + b.box[3]));
  const chars = CHARS.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y));
  const slots = new Map();
  chars.forEach(c => {
    const cb = charBB(c);
    let idx = furn.length;
    furn.forEach((f, i) => { const inFront = c.x >= f.box[2] || c.y >= f.box[3]; if (!inFront && overlap(cb, f.bb)) idx = Math.min(idx, i); });
    if (!slots.has(idx)) slots.set(idx, []);
    slots.get(idx).push(c);
  });
  const out = ITEMS.filter(i => i.wall).map(i => ({ item: i }));
  furn.forEach((f, i) => { (slots.get(i) || []).forEach(c => out.push({ char: c })); out.push({ item: f }); });
  (slots.get(furn.length) || []).forEach(c => out.push({ char: c }));
  drawOrder = out;
}
function drawChar(c, now) {
  if (c === pompa && c.hidden > now) return;
  const [sx, sy] = P(c.x, c.y);
  g.fillStyle = 'rgba(0,0,0,.22)';
  g.fillRect(Math.round(sx) - 3, Math.round(sy) - 1, 6, 1); g.fillRect(Math.round(sx) - 5, Math.round(sy), 10, 2); g.fillRect(Math.round(sx) - 3, Math.round(sy) + 2, 6, 1);
  if (c === pompa) {
    const moving = c.path.length > 0;
    const bob = moving ? 0 : (Math.floor(now / 500) % 2 ? -1 : 0);
    const blink = !moving && (now % 3800) < 130;
    const hop = moving && c.frame % 2 ? -1 : 0;
    const spr = pompaSprite(outfit, moving ? 1 + (c.frame % 2) : (blink ? 3 : 0), c.facing);
    g.drawImage(spr, Math.round(sx - 11), Math.round(sy - 26 + bob + hop));
  } else {
    const fr = (now % 4200) < 160 ? 3 : (c.wave > now ? 1 + Math.floor(now / 180) % 2 : 0);
    const spr = danielSprite(fr);
    g.drawImage(spr, Math.round(sx - 10), Math.round(sy - 25 + (Math.floor(now / 700) % 2 ? -1 : 0)));
  }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  // movement
  const c = pompa;
  if (c.path.length) {
    const [tx, ty] = c.path[0];
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), step = c.speed * dt;
    faceToward(c, tx, ty);
    if (d <= step) { c.x = tx; c.y = ty; c.path.shift(); if (!c.path.length && c.onArrive) { const f = c.onArrive; c.onArrive = null; f(); } }
    else { c.x += dx / d * step; c.y += dy / d * step; }
    c.ft += dt; if (c.ft > 0.13) { c.ft = 0; c.frame++; if (!reduceMotion && Math.random() < 0.25) burst(c, 1); }
  }
  // animate furniture
  ITEMS.forEach(it => { if (it.nf > 1) it.cur = Math.floor(now / 1000 * (it.fps || 4)) % it.nf; });
  // ambient bubbles from washer 01
  if (!reduceMotion && Math.random() < dt * 0.9) { const [bx, by] = P(1.5, 0.92, 16); spawnBubble(bx + (Math.random() * 8 - 4), by); }
  if (!reduceMotion && Math.random() < dt * 0.5) { const [bx, by] = P(1 + Math.random() * 7, 1 + Math.random() * 7); spawnBubble(bx, by - 4, 1); }
  for (let i = parts.length - 1; i >= 0; i--) { const b = parts[i]; b.t += dt; b.y -= b.vy * dt; if (b.t > b.life) parts.splice(i, 1); }

  if (cam.w > innerWidth && !down && (c.path.length || cam.follow)) {
    const [sx] = P(c.x, c.y);
    const want = innerWidth / 2 - sx * cam.s;
    cam.x += (want - cam.x) * Math.min(1, dt * 4); clampCam();
    if (Math.abs(want - cam.x) < 2) cam.follow = false;
  }
  computeOrder();
  g.clearRect(0, 0, LW, LH);
  g.drawImage(BG, 0, 0);
  if (hoverTile && !hoverItem) {
    const [x, y] = hoverTile;
    strokePoly(g, [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], free(x, y) ? '#ffffff' : '#ff7a7a');
  }
  for (const o of drawOrder) {
    if (o.item) {
      g.drawImage(o.item.frames[o.item.cur], 0, 0);
    } else drawChar(o.char, now);
  }
  if (hoverItem) { // outline hint
    const bb = hoverItem.bb; g.fillStyle = 'rgba(255,255,255,.9)';
    g.fillRect(bb[0] - 2, bb[1] - 2, 3, 1); g.fillRect(bb[0] - 2, bb[1] - 2, 1, 3);
    g.fillRect(bb[2] - 1, bb[1] - 2, 3, 1); g.fillRect(bb[2] + 1, bb[1] - 2, 1, 3);
    g.fillRect(bb[0] - 2, bb[3] + 1, 3, 1); g.fillRect(bb[0] - 2, bb[3] - 1, 1, 3);
    g.fillRect(bb[2] - 1, bb[3] + 1, 3, 1); g.fillRect(bb[2] + 1, bb[3] - 1, 1, 3);
  }
  parts.forEach(b => drawBubble(g, b));
  placeTags();
  // speech bubbles follow their speaker
  const stack = new Map();
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    if (now > b.until) { b.el.classList.add('fade'); if (now > b.until + 450) { b.el.remove(); bubbles.splice(i, 1); } }
  }
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i], n = stack.get(b.c) || 0;
    const [sx, sy] = P(b.c.x, b.c.y);
    const off = n ? bubbles.filter((x, j) => j > i && x.c === b.c).reduce((a, x) => a + x.el.offsetHeight + 8, 0) : 0;
    const half = b.el.offsetWidth / 2 + 6;
    b.el.style.left = Math.max(half, Math.min(innerWidth - half, cam.x + sx * cam.s)) + 'px';
    b.el.style.top = (cam.y + (sy - 30) * cam.s - 8 - off) + 'px';
    stack.set(b.c, n + 1);
  }
  requestAnimationFrame(frame);
}

/* ---------------- camera + input ---------------- */
const stage = $('#stage');
const cam = { s: 2, x: 0, y: 0, w: 0, h: 0 };
function layout() {
  const W = innerWidth, H = innerHeight;
  const base = Math.max(2, Math.floor(Math.min(W / LW, (H - 40) / LH)));
  const s = Math.max(2, Math.min(6, base + (cam.zoom || 0)));
  cam.zoom = s - base;
  cam.s = s; cam.w = LW * s; cam.h = LH * s;
  room.style.width = cam.w + 'px'; room.style.height = cam.h + 'px';
  centerCam();
}
function clampCam() {
  const W = innerWidth, H = innerHeight;
  cam.x = cam.w <= W ? Math.round((W - cam.w) / 2) : Math.min(0, Math.max(W - cam.w, cam.x));
  const top = 0, avail = H - 60;
  cam.y = cam.h <= avail ? Math.round(top + (avail - cam.h) / 2) : Math.min(60, Math.max(H - 120 - cam.h, cam.y));
  room.style.transform = `translate(${cam.x}px, ${cam.y}px)`;
}
function centerCam() {
  const [sx, sy] = P(4.5, 3.5, 10);
  cam.x = Math.round(innerWidth / 2 - sx * cam.s); cam.y = Math.round((innerHeight - 60) / 2 - sy * cam.s);
  clampCam();
}
function zoomBy(d) {
  const s = Math.max(2, Math.min(6, cam.s + d));
  if (s === cam.s) return;
  const cx = (innerWidth / 2 - cam.x) / cam.s, cy = (innerHeight / 2 - cam.y) / cam.s;
  cam.zoom = (cam.zoom || 0) + (s - cam.s);
  cam.s = s; cam.w = LW * s; cam.h = LH * s;
  room.style.width = cam.w + 'px'; room.style.height = cam.h + 'px';
  cam.x = Math.round(innerWidth / 2 - cx * s); cam.y = Math.round(innerHeight / 2 - cy * s);
  clampCam();
}
function toLogical(e) { return [(e.clientX - cam.x) / cam.s, (e.clientY - cam.y) / cam.s]; }
function tileAt(lx, ly) {
  const a = (lx - OX) / 16, b = (ly - OY) / 8;
  const x = Math.floor((a + b) / 2), y = Math.floor((b - a) / 2);
  return (x >= 0 && y >= 0 && x < COLS && y < ROWS) ? [x, y] : null;
}
function hitTest(lx, ly) {
  const X = Math.floor(lx), Y = Math.floor(ly);
  if (X < 0 || Y < 0 || X >= LW || Y >= LH) return null;
  const db = charBB(daniel); if (lx >= db[0] && lx < db[2] && ly >= db[1] + 2 && ly < db[3] - 6) return { npc: daniel };
  // pass 0: exact pixel; pass 1: forgiving margin (thin furniture, fingers)
  for (const R of [0, 3]) for (let i = drawOrder.length - 1; i >= 0; i--) {
    const it = drawOrder[i].item;
    if (!it || !it.act) continue;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const xx = X + dx, yy = Y + dy;
      if (xx >= 0 && yy >= 0 && xx < LW && yy < LH && it.alpha[yy * LW + xx]) return { item: it };
    }
  }
  return null;
}
let down = null;
stage.addEventListener('pointerdown', e => {
  down = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, drag: false, id: e.pointerId };
});
stage.addEventListener('pointermove', e => {
  if (down && e.pointerId === down.id) {
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.drag && Math.hypot(dx, dy) > 7) { down.drag = true; stage.classList.add('grab'); try { stage.setPointerCapture(e.pointerId); } catch (_) {} }
    if (down.drag) { cam.x = down.cx + dx; cam.y = down.cy + dy; clampCam(); }
    return;
  }
  if (e.pointerType !== 'mouse') return;
  const [lx, ly] = toLogical(e);
  const h = hitTest(lx, ly);
  hoverItem = h && h.item ? h.item : null;
  hoverTile = h ? null : tileAt(lx, ly);
  const tip = $('#tip');
  const label = h ? (h.item ? h.item.label : 'DANIEL · DEPENDIENTE') : null;
  stage.classList.toggle('hand', !!h);
  if (label) { tip.textContent = label; tip.style.display = 'block'; tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; }
  else tip.style.display = 'none';
});
stage.addEventListener('pointerleave', () => { hoverTile = null; hoverItem = null; $('#tip').style.display = 'none'; });
stage.addEventListener('pointerup', e => {
  if (!down || e.pointerId !== down.id) return;
  const wasDrag = down.drag; down = null; stage.classList.remove('grab');
  if (wasDrag || !$('#panel').hidden) return;
  const [lx, ly] = toLogical(e);
  const h = hitTest(lx, ly);
  if (h && h.item) return goUse(h.item);
  if (h && h.npc) return goUse(ITEMS.find(i => i.id === 'counter'));
  const t = tileAt(lx, ly);
  if (t && free(...t)) walkTo(t[0], t[1]);
});
stage.addEventListener('pointercancel', () => { down = null; stage.classList.remove('grab'); });
addEventListener('resize', layout);


/* ---------------- Daniel (respuestas fijas hasta conectar la IA) ---------------- */
const euro = c => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
function dropOpens(d) { return d && d.date ? new Date(d.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'pronto'; }
function danielReply(q) {
  const t = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/talla|size|mido|altura|cm\b/.test(t)) return 'El corte es boxy: si dudas entre dos tallas, coge la pequeña. Dime tu altura y te oriento.';
  if (/envi|shipping|llega|tarda/.test(t)) return 'Península en 48–72 h (4,90 €, gratis desde 100 €). Baleares, 7,90 €.';
  if (/devol|cambio|return/.test(t)) return 'Tienes 14 días para devolver. La tela cortada a medida no se devuelve.';
  if (/stock|queda|agotad/.test(t)) {
    const low = ITEMS_DATA.filter(i => /SOLO QUEDAN/.test(i.stockLabel)).map(i => `${i.name} (${i.stockLabel.toLowerCase()})`);
    return low.length ? 'Quedan pocas: ' + low.join(', ') + '. Agotado es agotado.' : 'Ahora mismo hay stock de casi todo.';
  }
  if (/precio|cuanto|cuesta|€|euro/.test(t)) return ITEMS_DATA.filter(i => i.purchasable).slice(0, 5).map(i => `${i.name} ${euro(i.priceCents)}`).join(' · ') + '.';
  if (/arte|patron|textura|textil|tela|lamina/.test(t)) return 'Cada pieza sale de un arte: patrones, texturas o textiles. Están en la pared de ARTES, a la izquierda.';
  if (/llave|key|codigo|code/.test(t)) return 'Las llaves se reparten antes de cada drop. La lavadora con candado solo abre con una.';
  if (/drop|lavadora|cuando|nuevo|next/.test(t)) {
    return DROPS.map(d => d.status === 'available' ? `La ${d.n} está girando (${d.name}).` : d.status === 'coming' ? `La ${d.n} se abre el ${dropOpens(d)}.` : d.status === 'locked' ? `La ${d.n}, solo con llave.` : `La ${d.n} está agotada.`).join(' ');
  }
  if (/hola|buenas|hey|ey\b|que tal|hi\b/.test(t)) return '¡Buenas! Soy Daniel, el de la lavandería. ¿Tallas, drops o envíos?';
  if (/pompa|quien eres|eres/.test(t)) return 'Yo soy una pastilla de jabón con contrato fijo. Tú eres Pompa: no explotes.';
  return 'Aún soy un Daniel de prueba: sé de tallas, drops, artes, envíos y precios. La IA de verdad llega pronto.';
}
function talkDaniel() {
  daniel.wave = performance.now() + 1400;
  say(daniel, ['¡Buenas! ¿Te ayudo con tallas, drops o envíos?', 'Unidades limitadas. Agotado es agotado.', 'Cada pieza sale de un arte. Mira la pared de ARTES.'][Math.floor(Math.random() * 3)]);
  if (matchMedia('(pointer: fine)').matches) setTimeout(() => $('#chatIn').focus({ preventScroll: true }), 50);
}

/* ---------------- panels ---------------- */
const panel = $('#panel'), pBody = $('#pBody'), pTitle = $('#pTitle');
let lastFocus = null;
function openPanel(title, html) {
  if (panel.hidden) lastFocus = document.activeElement;
  pTitle.textContent = title; pBody.innerHTML = html; panel.hidden = false;
  pBody.scrollTop = 0;
  const f = panel.querySelector('header button'); f && f.focus({ preventScroll: true });
}
function closePanel() { panel.hidden = true; trial = null; clearInterval(countTimer); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
panel.addEventListener('click', e => { if (e.target === panel) closePanel(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

function cardHTML(i) {
  const out = i.stockLabel === 'AGOTADO', low = /SOLO QUEDAN/.test(i.stockLabel);
  const tag = !i.purchasable && !out ? '<span class="tag low">PRONTO</span>' : out ? '<span class="tag out">AGOTADO</span>' : low ? '<span class="tag low">ÚLTIMAS</span>' : '';
  return `<a class="card" href="${i.href}"><div class="img">${tag}<img src="${artURL(i)}" alt=""></div>
    <div class="meta"><strong>${esc(i.name)}</strong>${euro(i.priceCents)}</div></a>`;
}
function openCatalog() {
  const groups = DROPS.map(d => {
    const items = ITEMS_DATA.filter(i => i.dropNumber === d.n);
    return items.length ? `<div class="eyebrow" style="margin-top:6px">LAVADORA ${d.n} · ${esc(d.name)} · ${PHASE_LABEL[d.phase] || ''}</div><div class="grid" style="margin-bottom:14px">${items.map(cardHTML).join('')}</div>` : '';
  }).join('');
  openPanel('PRODUCTOS', groups || '<p>Todavía no hay piezas.</p>');
}
function openDrop(id) {
  const d = DROPS.find(x => x.id === id);
  const items = ITEMS_DATA.filter(i => i.dropNumber === d.n);
  const body = `<div class="eyebrow">DROP ${d.n} · ${PHASE_LABEL[d.phase] || ''}</div><h3 class="big">${esc(d.name)}</h3>`;
  const more = `<p style="margin-top:12px"><a class="pbtn" href="${d.href}">VER EL DROP →</a></p>`;
  if (d.status === 'coming') {
    openPanel(`LAVADORA ${d.n}`, body + `<div class="eyebrow">SE ABRE EN</div><div class="count" id="count"></div><div class="grid">${items.map(cardHTML).join('')}</div>` + more);
    tickCount(d); countTimer = setInterval(() => tickCount(d), 1000);
    return;
  }
  if (d.status === 'locked') return openKey(d);
  openPanel(`LAVADORA ${d.n}`, body + `<div class="grid">${items.map(cardHTML).join('')}</div>` + more);
}
let countTimer;
function tickCount(d) {
  const el = $('#count'); if (!el) return clearInterval(countTimer);
  let s = Math.max(0, Math.floor((new Date(d.date) - Date.now()) / 1000));
  const parts = [[Math.floor(s / 86400), 'DÍAS'], [Math.floor(s / 3600) % 24, 'HORAS'], [Math.floor(s / 60) % 60, 'MIN'], [s % 60, 'SEG']];
  el.innerHTML = parts.map(([v, l]) => `<div><b>${String(v).padStart(2, '0')}</b><span>${l}</span></div>`).join('');
}
function openKey(d) {
  d = d || DROPS.find(x => x.status === 'locked');
  if (!d) return openPanel('TU LLAVE', '<p>Ahora mismo no hay ninguna lavadora con candado.</p>');
  openPanel('TU LLAVE', `<div class="eyebrow">LAVADORA ${d.n} · CERRADA</div><h3 class="big">${esc(d.name)}</h3>
    <p>Solo con llave. Las llaves se reparten antes de cada drop, a quien esté dentro.</p>
    <form class="field" data-form="key"><input id="keyIn" placeholder="XXXXX-0000" aria-label="Tu llave" autocomplete="off"><button class="pbtn">ABRIR</button></form>
    <div class="stock" id="keyMsg"></div><p style="margin-top:12px"><a class="pbtn ghost" href="${d.href}">VER EL DROP →</a></p>`);
}

let trial = null;
function wearOptions(slot) {
  const o = { none: { label: 'Nada' } };
  ITEMS_DATA.filter(i => i.wear && i.wear.slot === slot).forEach(i => { o[i.slug] = { label: i.name, kind: i.wear.kind, color: i.color, href: i.href, price: i.priceCents }; });
  return o;
}
function openWardrobe() {
  trial = trial || Object.assign({}, outfit);
  const TOPS = wearOptions('top'), HEADS = wearOptions('head');
  const cur = { top: trial.topSlug || 'none', head: trial.headSlug || 'none' };
  const opts = (map, slot) => Object.entries(map).map(([k, v]) => `<button class="ch ${cur[slot] === k ? 'on' : ''}" data-act="wear" data-slot="${slot}" data-v="${k}">${esc(v.label)}</button>`).join('');
  const links = [TOPS[cur.top], HEADS[cur.head]].filter(x => x && x.href).map(x => `<a class="pbtn ghost" href="${x.href}">${esc(x.label)} · ${euro(x.price)} →</a>`).join('');
  openPanel('VESTIDOR DE POMPA', `<div class="wardrobe">
      <div class="mirror"><canvas id="mirror" width="22" height="28"></canvas></div>
      <div>
        <div class="opt"><div class="eyebrow">PIEL</div><div class="row">${Object.entries(SKINS).map(([k, s]) => `<button class="sw ${trial.skin === k ? 'on' : ''}" style="background:${s.base}" data-act="wear" data-slot="skin" data-v="${k}" aria-label="${s.name}" title="${s.name}"></button>`).join('')}</div></div>
        <div class="opt"><div class="eyebrow">ARRIBA</div><div class="row">${opts(TOPS, 'top')}</div></div>
        <div class="opt"><div class="eyebrow">CABEZA</div><div class="row">${opts(HEADS, 'head')}</div></div>
        <div class="opt"><div class="eyebrow">CARA</div><div class="row">${Object.entries(FACES).map(([k, v]) => `<button class="ch ${trial.face === k ? 'on' : ''}" data-act="wear" data-slot="face" data-v="${k}">${v}</button>`).join('')}</div></div>
        <div class="row"><button class="pbtn" data-act="save-look">GUARDAR LOOK</button><button class="pbtn ghost" data-act="random-look">ALEATORIO</button></div>
        ${links ? `<div class="opt" style="margin-top:14px"><div class="eyebrow">LO QUE LLEVA, EN LA TIENDA</div><div class="row">${links}</div></div>` : ''}
      </div></div>`);
  const m = $('#mirror').getContext('2d'); m.imageSmoothingEnabled = false; m.drawImage(pompaSprite(trial, 0, 1), 0, 0);
}
function setWear(slot, v) {
  if (slot === 'skin' || slot === 'face') { trial[slot] = v; return; }
  const o = wearOptions(slot)[v];
  if (!o || v === 'none') { trial[slot] = 'none'; trial[slot + 'Color'] = null; trial[slot + 'Slug'] = null; return; }
  trial[slot] = o.kind; trial[slot + 'Color'] = o.color; trial[slot + 'Slug'] = v;
}
function refreshChip() { const c = $('#chipAv').getContext('2d'); c.imageSmoothingEnabled = false; c.clearRect(0, 0, 22, 22); c.drawImage(pompaSprite(outfit, 0, 1), 0, -2); $('#nick').textContent = nick; }

function openArtworks() {
  const kinds = [['patron', 'PATRONES DE ESTAMPADO'], ['textura', 'TEXTURAS'], ['textil', 'TEXTILES']];
  openPanel('ARTES', kinds.map(([k, l]) => {
    const list = ARTS.filter(a => a.kind === k);
    return list.length ? `<div class="eyebrow">${l}</div><div class="arch" style="margin-bottom:14px">${list.map(a => `<a class="polaroid" href="${a.href}"><i style="background:url(${swatchURL(a)}) 0 0/48px 48px;image-rendering:pixelated"></i><b>${esc(a.kindLabel.toUpperCase())}</b><span>${esc(a.name)}</span></a>`).join('')}</div>` : '';
  }).join('') + `<p><a class="pbtn" href="/artes">VER TODAS LAS ARTES →</a></p>`);
}
const PAGES = {
  story: ['HISTORIA', `<div class="eyebrow">${BRAND} — EST. 2026</div><h3 class="big">UNA LAVANDERÍA DE IDEAS</h3>
    <p>Dani R. diseña patrones de estampado, texturas y textiles, y los convierte en prendas, láminas y tela por metro.</p>
    <p>Aquí cada lavadora es un drop. Unas giran, otras esperan y alguna solo se abre con llave. La ropa sale limpia; las ideas, no.</p>
    <p>Pompa es quien te representa dentro. Vístela en el vestidor y habla con Daniel en el mostrador.</p>`],
  contact: ['CONTACTO', `<p>Para colaboraciones, prensa o dudas con un pedido.</p><p><strong>Email y redes:</strong> pendientes de confirmar.</p>`],
  shipping: ['ENVÍOS', `<p>Península: 48–72 h, 4,90 € (gratis desde 100 €). Baleares: 7,90 €.</p><p><a class="pbtn" href="/legal/envios">ENVÍOS →</a></p>`],
  returns: ['DEVOLUCIONES', `<p>14 días para desistir. La tela cortada a medida no admite devolución.</p><p><a class="pbtn" href="/legal/devoluciones">DEVOLUCIONES →</a></p>`],
};
function openLogin() {
  openPanel('ENTRAR', `<p>Las cuentas llegan más adelante. Por ahora eres invitado, pero puedes ponerte nombre para hablar en la lavandería.</p>
    <form class="field" data-form="nick"><input id="nickIn" maxlength="12" value="${esc(nick)}" aria-label="Tu nombre"><button class="pbtn">GUARDAR</button></form>`);
}

function act(el) {
  const a = el.dataset.act, d = el.dataset;
  switch (a) {
    case 'close': return closePanel();
    case 'home': closePanel(); centerCam(); return say(pompa, '¡Hola!');
    case 'zoom-in': return zoomBy(1);
    case 'zoom-out': return zoomBy(-1);
    case 'catalog': return openCatalog();
    case 'drops': return openPanel('DROPS', `<div class="grid">${DROPS.map(x => `<a class="card" href="${x.href}"><div class="img"><span class="tag ${x.status === 'available' ? '' : x.status === 'coming' ? 'low' : 'out'}">${PHASE_LABEL[x.phase] || ''}</span><img src="${iconURL('washer', '#1a1a1e')}" alt=""></div><div class="meta"><strong>${x.n} · ${esc(x.name)}</strong>Lavadora ${x.n}</div></a>`).join('')}</div>`);
    case 'key': return openKey();
    case 'wardrobe': return openWardrobe();
    case 'wear': setWear(d.slot, d.v); return openWardrobe();
    case 'random-look': { const pick = o => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
      trial = Object.assign({}, outfit, { skin: pick(SKINS), face: pick(FACES) }); setWear('top', pick(wearOptions('top'))); setWear('head', pick(wearOptions('head'))); return openWardrobe(); }
    case 'save-look': Object.assign(outfit, trial); trial = null; store.set('outfit2', outfit); refreshChip(); closePanel(); pompa.hidden = 0; burst(pompa, 10);
      return say(pompa, 'Así salgo del vestidor.');
    case 'artworks': return openArtworks();
    case 'login': return openLogin();
    default: if (PAGES[a]) return openPanel(...PAGES[a]);
  }
}
ROOT.addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (el) { e.preventDefault(); act(el); } });
pBody.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target.dataset.form;
  if (f === 'key') { const m = $('#keyMsg'); m.className = 'stock out'; m.textContent = 'ESA LLAVE NO ABRE NADA AQUÍ'; }
  if (f === 'nick') { nick = ($('#nickIn').value.trim() || 'INVITADO').toUpperCase().slice(0, 12); store.set('nick', nick); refreshChip(); closePanel(); say(pompa, 'Ahora me llamo ' + nick + '.'); }
});

/* ---------------- bolsa (cookie de la tienda) ---------------- */
function bagCount() {
  const m = document.cookie.match(/(?:^|; )sbx_bolsa=([^;]*)/);
  if (!m) return 0;
  return decodeURIComponent(m[1]).split('.').reduce((s, p) => { const q = Number(p.split(':')[1]); return s + (Number.isInteger(q) && q > 0 ? Math.min(q, 10) : 0); }, 0);
}
function refreshBag() { const n = bagCount(); $('#bagN').textContent = n ? String(n) : ''; }
document.addEventListener('visibilitychange', refreshBag);

/* ---------------- intro ---------------- */
function introArt() {
  const t = textPts(BRAND); const [c, cg] = [$('#introLogo'), $('#introLogo').getContext('2d')];
  c.width = t.w + 2; c.height = 7; cg.imageSmoothingEnabled = false;
  drawText(cg, BRAND, 1, 1, '#2a2a2e'); drawText(cg, BRAND, 0, 0, '#f2f0eb');
  const pg = $('#introPompa').getContext('2d'); pg.imageSmoothingEnabled = false; pg.drawImage(pompaSprite(outfit, 0, 1), 0, 0);
}
function start() {
  $('#intro').classList.add('out');
  setTimeout(() => $('#intro').remove(), 600);
  cam.follow = true;
  walkTo(2, 7, () => say(pompa, '¿Hola?'));
  setTimeout(() => { daniel.wave = performance.now() + 1600; say(daniel, 'Bienvenido a la lavandería. Toca el suelo para moverte y los muebles para usarlos.', 7500); }, 900);
}

/* ---------------- boot ---------------- */
document.body.style.overflow = 'hidden';
document.querySelectorAll('#lavanderia img[data-icon]').forEach(im => { im.src = iconURL(im.dataset.icon); });
introArt(); refreshChip(); refreshBag();
fetch('/api/room').then(r => { if (!r.ok) throw new Error('room'); return r.json(); }).then(data => {
  applyData(data);
  buildItems(); rebuildBlocked();
  BG = buildBG();
  prerender();
  buildTags();
  layout();
  requestAnimationFrame(frame);
  const enter = $('#enter'); enter.disabled = false; enter.textContent = 'ENTRAR';
  enter.addEventListener('click', start);
  window.__sbx = { pompa, daniel, walkTo, ITEMS, outfit, openPanel, act, cam, P };
}).catch(() => { const enter = $('#enter'); enter.textContent = 'NO SE PUDO CARGAR'; });
})();
