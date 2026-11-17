/*
 * Base de la lavandería: proyección isométrica, color, trazados y sprites.
 * La sala se dibuja en vectorial (unidades de mundo) y se escala con la cámara:
 * una baldosa mide 96×48 unidades en pantalla.
 */
export type G = CanvasRenderingContext2D;
export type Pt = [number, number];

export const TW = 48; // medio ancho de baldosa
export const TH = 24; // medio alto de baldosa
export const COLS = 12; // eje x (pared derecha)
export const ROWS = 10; // eje y (pared izquierda)
export const WALL = 252; // alto de las paredes
export const TILE_BAND = 96; // alto del zócalo de azulejo
export const INK = '#17171b';

/** Suelo (x, y) y altura z → pantalla, en unidades de mundo. */
export const P = (x: number, y: number, z = 0): Pt => [(x - y) * TW, (x + y) * TH - z];

/** Pantalla (unidades de mundo, z = 0) → coordenadas de suelo sin redondear. */
export function unproject(wx: number, wy: number): Pt {
  const a = wx / TW, b = wy / TH;
  return [(a + b) / 2, (b - a) / 2];
}

/* ---------------- color ---------------- */
const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const hex2 = (v: number) => clamp255(v).toString(16).padStart(2, '0');
/** k < 0 oscurece hacia negro, k > 0 aclara hacia blanco. */
export function shade(hex: string, k: number): string {
  const [r, g, b] = rgb(hex);
  const f = (v: number) => (k < 0 ? v * (1 + k) : v + (255 - v) * k);
  return '#' + hex2(f(r)) + hex2(f(g)) + hex2(f(b));
}
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a), [r2, g2, b2] = rgb(b);
  return '#' + hex2(r1 + (r2 - r1) * t) + hex2(g1 + (g2 - g1) * t) + hex2(b1 + (b2 - b1) * t);
}
export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
/** Luminosidad percibida 0..1. */
export function luma(hex: string): number {
  const [r, g, b] = rgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/* ---------------- trazados ---------------- */
export function path(g: G, pts: readonly Pt[], close = true) {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  if (close) g.closePath();
}
export type Paint = string | CanvasGradient | CanvasPattern;
export function poly(g: G, pts: readonly Pt[], fill?: Paint | null, stroke?: string | null, lw = 1.5) {
  path(g, pts);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
}
export function seg(g: G, a: Pt, b: Pt, stroke: string, lw = 1.5) {
  g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]);
  g.strokeStyle = stroke; g.lineWidth = lw; g.lineCap = 'round'; g.stroke();
}
export function rrect(g: G, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2));
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}
export function ellipse(g: G, cx: number, cy: number, rx: number, ry: number, fill?: Paint | null, stroke?: string | null, lw = 1.5, rot = 0) {
  g.beginPath(); g.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
/** Degradado vertical entre dos alturas de pantalla. */
export function vgrad(g: G, y0: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
export function lgrad(g: G, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}
export function rgrad(g: G, x: number, y: number, r0: number, r1: number, stops: [number, string][]): CanvasGradient {
  const gr = g.createRadialGradient(x, y, r0, x, y, Math.max(r0 + 0.01, r1));
  stops.forEach(([o, c]) => gr.addColorStop(o, c));
  return gr;
}

/* ---------------- caras y cajas isométricas ---------------- */
/** Cara en un plano y = cte (mira hacia la cámara por la izquierda). */
export const yFace = (x0: number, x1: number, y: number, z0: number, z1: number): Pt[] => [P(x0, y, z1), P(x1, y, z1), P(x1, y, z0), P(x0, y, z0)];
/** Cara en un plano x = cte (mira hacia la cámara por la derecha). */
export const xFace = (x: number, y0: number, y1: number, z0: number, z1: number): Pt[] => [P(x, y1, z1), P(x, y0, z1), P(x, y0, z0), P(x, y1, z0)];
export const zFace = (x0: number, y0: number, x1: number, y1: number, z: number): Pt[] => [P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)];

const bounds = (pts: readonly Pt[]) => {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return [y0, y1] as const;
};
/** Rellena una cara con una caída suave de luz hacia abajo. */
export function litFace(g: G, pts: readonly Pt[], color: string, fall = 0.14, stroke: string | null = INK, lw = 1.5) {
  const [y0, y1] = bounds(pts);
  poly(g, pts, vgrad(g, y0, y1, [[0, color], [1, shade(color, -fall)]]), stroke, lw);
}
export type BoxOpts = { top?: string; left?: string; right?: string; stroke?: string | null; lw?: number; fall?: number };
/** Caja isométrica: tapa, cara izquierda (plano y+d) y cara derecha (plano x+w). */
export function box(g: G, x: number, y: number, z: number, w: number, d: number, h: number, color: string, o: BoxOpts = {}) {
  const stroke = o.stroke === undefined ? INK : o.stroke, lw = o.lw ?? 1.5;
  litFace(g, yFace(x, x + w, y + d, z, z + h), o.left ?? shade(color, -0.1), o.fall ?? 0.16, stroke, lw);
  litFace(g, xFace(x + w, y, y + d, z, z + h), o.right ?? shade(color, -0.26), o.fall ?? 0.16, stroke, lw);
  poly(g, zFace(x, y, x + w, y + d, z + h), o.top ?? shade(color, 0.12), stroke, lw);
}
/** Cilindro vertical (macetas, taburetes, rollos). */
export function cyl(g: G, x: number, y: number, z: number, r: number, h: number, color: string, top?: string, stroke: string | null = INK) {
  const [cx, cy] = P(x, y, z), rx = r * TW * 1.42, ry = rx / 2;
  g.beginPath();
  g.moveTo(cx - rx, cy - h); g.lineTo(cx - rx, cy);
  g.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  g.lineTo(cx + rx, cy - h); g.closePath();
  g.fillStyle = lgrad(g, cx - rx, 0, cx + rx, 0, [[0, shade(color, 0.08)], [0.45, color], [1, shade(color, -0.3)]]);
  g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
  ellipse(g, cx, cy - h, rx, ry, top ?? shade(color, 0.16), stroke);
}

/* ---------------- planos para dibujar «en 2D» sobre la sala ---------------- */
/** Pared derecha (y = cte): u crece con x (48 por baldosa), v crece hacia abajo. Origen en (x, y, z). */
export function onY(g: G, x: number, y: number, z: number, draw: () => void) {
  const [ox, oy] = P(x, y, z);
  g.save(); g.transform(1, 0.5, 0, 1, ox, oy); draw(); g.restore();
}
/** Pared izquierda (x = cte): u crece hacia la derecha de la pantalla (y decreciente). Origen en (x, y, z). */
export function onX(g: G, x: number, y: number, z: number, draw: () => void) {
  const [ox, oy] = P(x, y, z);
  g.save(); g.transform(1, -0.5, 0, 1, ox, oy); draw(); g.restore();
}
/** Suelo (z = cte): u crece con x, v crece con y (48 por baldosa). Origen en (x, y, z). */
export function onFloor(g: G, x: number, y: number, z: number, draw: () => void) {
  const [ox, oy] = P(x, y, z);
  g.save(); g.transform(1, 0.5, -1, 0.5, ox, oy); draw(); g.restore();
}

/* ---------------- sprites en caché ---------------- */
export type Sprite = { c: HTMLCanvasElement; x: number; y: number; w: number; h: number };
export function canvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return [c, c.getContext('2d')!];
}
/** Dibuja una vez en un lienzo aparte lo que cabe en [x0, y0]–[x1, y1] (unidades de mundo). */
export function sprite(x0: number, y0: number, x1: number, y1: number, res: number, draw: (g: G) => void): Sprite {
  x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
  const [c, g] = canvas((x1 - x0) * res, (y1 - y0) * res);
  g.scale(res, res); g.translate(-x0, -y0);
  draw(g);
  return { c, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
export function put(g: G, s: Sprite, dx = 0, dy = 0) { g.drawImage(s.c, s.x + dx, s.y + dy, s.w, s.h); }

/** Caja en pantalla que envuelve un volumen de suelo [x0,y0]–[x1,y1] de alto h, con margen. */
export function hull(x0: number, y0: number, x1: number, y1: number, h: number, pad = 6, z0 = 0): [number, number, number, number] {
  return [P(x0, y1)[0] - pad, P(x0, y0, z0 + h)[1] - pad, P(x1, y0)[0] + pad, P(x1, y1, z0)[1] + pad];
}

/* ---------------- varios ---------------- */
export const store = {
  get<T>(k: string, d: T): T {
    try { const v = localStorage.getItem('sbx_' + k); return v ? (JSON.parse(v) as T) : d; } catch { return d; }
  },
  set(k: string, v: unknown) { try { localStorage.setItem('sbx_' + k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};
export const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const TAU = Math.PI * 2;
/** Generador determinista (decoración que no debe bailar entre repintados). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
export const FONT_SANS = '"Familjen Grotesk", "Helvetica Neue", Arial, sans-serif';
export const FONT_PX = 'Silkscreen, ui-monospace, monospace';
