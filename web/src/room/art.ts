/* Artes (patrones), ilustraciones de las piezas e iconos del HUD. Todo vectorial. */
import type { PatternSpec } from '@/modules/catalog/domain';
import type { RoomSprite } from '@/modules/catalog/room';
import { canvas, ellipse, INK, lgrad, luma, rrect, shade, TAU, type G } from './core';

/* ---------------- patrones ---------------- */
const TILE_S = 16, TILE_K = 4; // la baldosa del patrón mide 2·s unidades y se pinta a 4 px por unidad
const tiles = new Map<string, HTMLCanvasElement>();

/** Baldosa repetible de un arte; mismo dibujo que el <pattern> SVG de la tienda (ArtSwatch). */
export function patternTile(spec: PatternSpec): HTMLCanvasElement {
  const key = spec.motif + '|' + spec.colors.join(',');
  const hit = tiles.get(key);
  if (hit) return hit;
  const [a = '#1a1a1e', b = '#e8e0d0', c = b, d = c] = spec.colors;
  const s = TILE_S, [cv, g] = canvas(s * 2 * TILE_K, s * 2 * TILE_K);
  g.scale(TILE_K, TILE_K);
  const bg = (col: string) => { g.fillStyle = col; g.fillRect(0, 0, s * 2, s * 2); };
  const ring = (x: number, y: number, r: number, col: string, lw: number) => {
    // se repite en los bordes para que la baldosa case
    for (const ox of [-2 * s, 0, 2 * s]) for (const oy of [-2 * s, 0, 2 * s]) ellipse(g, x + ox, y + oy, r, r, null, col, lw);
  };
  switch (spec.motif) {
    case 'checker': bg(b); g.fillStyle = a; g.fillRect(0, 0, s, s); g.fillRect(s, s, s, s); break;
    case 'stripes': bg(a); g.fillStyle = b; g.fillRect(0, 0, s * 0.7, s * 2); break;
    case 'dots':
      bg(a); ellipse(g, s * 0.8, s * 0.8, s * 0.34, s * 0.34, b); ellipse(g, s * 1.7, s * 1.6, s * 0.22, s * 0.22, b); break;
    case 'waves':
      bg(a); g.strokeStyle = b; g.lineWidth = s / 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-s, s);
      g.quadraticCurveTo(-s / 2, s * 1.67, 0, s); g.quadraticCurveTo(s / 2, s / 3, s, s); g.quadraticCurveTo(s * 1.5, s * 1.67, s * 2, s); g.quadraticCurveTo(s * 2.5, s / 3, s * 3, s);
      g.stroke(); break;
    case 'grain':
      bg(a); g.fillStyle = b;
      [[1, 3], [7, 2], [4, 9], [12, 6], [15, 14], [9, 15], [2, 13], [14, 1]].forEach(([x, y]) => g.fillRect((x! / 16) * s * 2, (y! / 16) * s * 2, s / 5, s / 5));
      break;
    case 'loops': bg(a); ring(s / 2, s / 2, s / 3, b, s / 6); ring(s * 1.5, s * 1.5, s / 3, b, s / 6); break;
    case 'weave':
      bg(a); g.fillStyle = b; g.fillRect(0, s / 3, s * 2, s / 3);
      g.globalAlpha = 0.7; g.fillRect(s * 1.3, 0, s / 3, s * 2); g.globalAlpha = 1; break;
    case 'bubbles':
      bg(a); ring(s * 0.6, s * 0.6, s * 0.4, b, s / 6); ring(s * 1.5, s * 1.2, s * 0.28, c, s / 6); ring(s * 0.9, s * 1.65, s * 0.18, d, s / 7);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(s * 0.38, s * 0.36, s * 0.1, s * 0.1); break;
  }
  tiles.set(key, cv);
  return cv;
}
/** Relleno con el arte: `rep` es lo que mide una repetición, en las unidades del dibujo. */
export function patternFill(g: G, spec: PatternSpec, rep: number, ox = 0, oy = 0): CanvasPattern {
  const p = g.createPattern(patternTile(spec), 'repeat')!;
  const k = rep / (TILE_S * 2 * TILE_K);
  p.setTransform(new DOMMatrix([k, 0, 0, k, ox, oy]));
  return p;
}
/** Repetición proporcional a la escala del arte, para un dibujo de `box` unidades de lado. */
export const repFor = (spec: PatternSpec, box: number) => (Math.max(2, (spec.scale ?? 10) / 4) * 2 / 48) * box;
/** Tono medio de un arte (para detalles: costuras, tejido doblado). */
export const artTone = (spec: PatternSpec) => spec.colors[0] ?? '#e8e0d0';
export const artAccent = (spec: PatternSpec) => spec.colors[1] ?? spec.colors[0] ?? '#17171b';

/* ---------------- piezas (caja de 100×100) ---------------- */
export type Piece = { sprite: RoomSprite; pattern: PatternSpec; color: string };
type PieceOpts = { hanger?: boolean; shadow?: boolean };

function volume(g: G, x0: number, x1: number, k = 0.22) {
  g.fillStyle = lgrad(g, x0, 0, x1, 0, [[0, 'rgba(255,255,255,.10)'], [0.3, 'rgba(255,255,255,0)'], [0.62, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${k})`]]);
  g.fill();
}
function outline(g: G, lw = 2.2) { g.strokeStyle = INK; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }
function hanger(g: G) {
  g.strokeStyle = '#8d8d97'; g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(50, 13); g.lineTo(50, 7); g.arc(53, 6, 3, Math.PI, Math.PI * 1.9); g.stroke();
}
const teeBody = (g: G) => {
  g.beginPath();
  g.moveTo(40, 13); g.quadraticCurveTo(50, 21, 60, 13);
  g.lineTo(69, 16); g.lineTo(90, 31); g.lineTo(80, 46); g.lineTo(70, 39);
  g.lineTo(71, 88); g.quadraticCurveTo(50, 91, 29, 88);
  g.lineTo(30, 39); g.lineTo(20, 46); g.lineTo(10, 31); g.lineTo(31, 16); g.closePath();
};
const hoodBody = (g: G) => {
  g.beginPath();
  g.moveTo(38, 20); g.quadraticCurveTo(50, 28, 62, 20);
  g.lineTo(72, 22); g.quadraticCurveTo(88, 30, 92, 78); g.lineTo(80, 80); g.lineTo(74, 46);
  g.lineTo(74, 90); g.lineTo(26, 90);
  g.lineTo(26, 46); g.lineTo(20, 80); g.lineTo(8, 78); g.quadraticCurveTo(12, 30, 28, 22); g.closePath();
};

function drawTee(g: G, fill: CanvasPattern, tone: string, accent: string) {
  teeBody(g); g.fillStyle = fill; g.fill(); volume(g, 10, 90); outline(g);
  g.save(); teeBody(g); g.clip();
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, 84, 100, 3); // dobladillo
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(16, 40); g.lineTo(24, 28); g.moveTo(84, 40); g.lineTo(76, 28); g.stroke(); // costura de la manga
  g.beginPath(); g.moveTo(34, 50); g.quadraticCurveTo(37, 66, 33, 84); g.moveTo(64, 46); g.quadraticCurveTo(62, 62, 66, 80); g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 2; g.stroke();
  g.restore();
  g.beginPath(); g.moveTo(40, 13); g.quadraticCurveTo(50, 21, 60, 13); g.quadraticCurveTo(50, 26, 40, 13); g.closePath();
  g.fillStyle = shade(tone, luma(tone) > 0.5 ? -0.22 : 0.25); g.fill(); outline(g, 1.6);
  void accent;
}
function drawHoodie(g: G, fill: CanvasPattern, tone: string, accent: string) {
  // capucha por detrás del cuello
  g.beginPath(); g.moveTo(33, 24); g.quadraticCurveTo(30, 4, 50, 5); g.quadraticCurveTo(70, 4, 67, 24); g.quadraticCurveTo(50, 32, 33, 24); g.closePath();
  g.fillStyle = fill; g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; g.fill(); outline(g);
  g.beginPath(); g.ellipse(50, 19, 9.5, 8, 0, 0, TAU); g.fillStyle = shade(tone, -0.55); g.fill(); outline(g, 1.6);
  hoodBody(g); g.fillStyle = fill; g.fill(); volume(g, 8, 92, 0.26); outline(g);
  g.save(); hoodBody(g); g.clip();
  const rib = shade(tone, luma(tone) > 0.5 ? -0.3 : 0.2);
  g.fillStyle = rib; g.fillRect(24, 84, 52, 7); g.fillRect(4, 74, 20, 8); g.fillRect(76, 74, 20, 8);
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1;
  for (let x = 27; x < 76; x += 4) { g.beginPath(); g.moveTo(x, 84); g.lineTo(x, 91); g.stroke(); }
  g.restore();
  // bolsillo canguro
  g.beginPath(); g.moveTo(36, 62); g.lineTo(64, 62); g.lineTo(68, 80); g.lineTo(32, 80); g.closePath();
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fill(); outline(g, 1.5);
  // cordones
  g.strokeStyle = luma(tone) > 0.6 ? '#3a3a42' : '#f2f0eb'; g.lineWidth = 1.8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(45, 26); g.lineTo(44, 44); g.moveTo(55, 26); g.lineTo(56, 40); g.stroke();
  void accent;
}
function drawBeanie(g: G, fill: CanvasPattern, tone: string, accent: string) {
  ellipse(g, 50, 16, 9, 9, luma(accent) > 0.35 ? accent : '#f2f0eb', INK, 2.2);
  g.beginPath(); g.moveTo(20, 64); g.quadraticCurveTo(18, 22, 50, 22); g.quadraticCurveTo(82, 22, 80, 64); g.closePath();
  g.fillStyle = fill; g.fill(); volume(g, 20, 80, 0.26); outline(g);
  g.save(); g.clip(); g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1.5;
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(50 + i * 4, 22); g.quadraticCurveTo(50 + i * 10, 42, 50 + i * 9.4, 66); g.stroke(); }
  g.restore();
  rrect(g, 16, 60, 68, 22, 7); g.fillStyle = shade(tone, luma(tone) > 0.5 ? -0.16 : 0.16); g.fill(); volume(g, 16, 84, 0.22); outline(g);
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.2;
  for (let x = 22; x < 82; x += 5) { g.beginPath(); g.moveTo(x, 62); g.lineTo(x, 80); g.stroke(); }
  rrect(g, 26, 66, 13, 9, 1.5); g.fillStyle = '#f2f0eb'; g.fill(); outline(g, 1.2);
}
function drawPrint(g: G, fill: CanvasPattern) {
  g.strokeStyle = '#8d8d97'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(34, 12); g.lineTo(50, 4); g.lineTo(66, 12); g.stroke();
  ellipse(g, 50, 4, 1.8, 1.8, '#5c5c64');
  rrect(g, 17, 11, 66, 82, 2); g.fillStyle = '#1d1d21'; g.fill(); outline(g);
  g.fillStyle = '#fbfaf6'; g.fillRect(22, 16, 56, 72);
  g.fillStyle = fill; g.fillRect(29, 23, 42, 58);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1; g.strokeRect(29, 23, 42, 58);
  g.fillStyle = lgrad(g, 22, 16, 78, 88, [[0, 'rgba(255,255,255,.28)'], [0.35, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.08)']]);
  g.fillRect(22, 16, 56, 72);
}
function drawFabric(g: G, fill: CanvasPattern, tone: string) {
  // paño desenrollado con caída
  g.beginPath(); g.moveTo(30, 16); g.lineTo(88, 22); g.lineTo(90, 84);
  g.quadraticCurveTo(82, 90, 74, 84); g.quadraticCurveTo(66, 90, 58, 85); g.quadraticCurveTo(50, 91, 42, 86); g.quadraticCurveTo(36, 90, 30, 88); g.closePath();
  g.fillStyle = fill; g.fill();
  g.save(); g.clip();
  for (const x of [44, 60, 76]) { g.fillStyle = lgrad(g, x - 6, 0, x + 6, 0, [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(0,0,0,.16)'], [1, 'rgba(255,255,255,.1)']]); g.fillRect(x - 6, 10, 12, 86); }
  g.restore(); outline(g);
  // rollo
  rrect(g, 12, 12, 20, 80, 9); g.fillStyle = fill; g.fill();
  g.fillStyle = lgrad(g, 12, 0, 32, 0, [[0, 'rgba(255,255,255,.22)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.3)']]); g.fill(); outline(g);
  ellipse(g, 22, 13, 10, 4, '#c9a877', INK, 2); ellipse(g, 22, 13, 4, 1.6, '#3a2a1c');
  void tone;
}
function drawScarf(g: G, fill: CanvasPattern, tone: string) {
  g.strokeStyle = '#8d8d97'; g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath(); g.moveTo(14, 16); g.lineTo(86, 16); g.stroke();
  g.beginPath(); g.moveTo(16, 17); g.lineTo(84, 17); g.lineTo(50, 90); g.closePath();
  g.fillStyle = shade(tone, -0.4); g.fill(); outline(g);
  g.beginPath(); g.moveTo(22, 20); g.lineTo(78, 20); g.lineTo(50, 81); g.closePath();
  g.fillStyle = fill; g.fill(); volume(g, 22, 78, 0.24);
  g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(50, 22); g.lineTo(50, 80); g.stroke();
}

/** Dibuja una pieza en la caja (0,0)–(100,100) del contexto actual. */
export function drawPiece(g: G, it: Piece, o: PieceOpts = {}) {
  const fill = patternFill(g, it.pattern, repFor(it.pattern, 100));
  const tone = artTone(it.pattern), accent = artAccent(it.pattern);
  g.save();
  if (o.shadow) { g.shadowColor = 'rgba(0,0,0,.28)'; g.shadowBlur = 6; g.shadowOffsetX = 2; g.shadowOffsetY = 3; }
  if (o.hanger !== false && (it.sprite === 'tee' || it.sprite === 'hoodie')) hanger(g);
  switch (it.sprite) {
    case 'hoodie': drawHoodie(g, fill, tone, accent); break;
    case 'tee': drawTee(g, fill, tone, accent); break;
    case 'beanie': drawBeanie(g, fill, tone, accent); break;
    case 'print': drawPrint(g, fill); break;
    case 'fabric': drawFabric(g, fill, tone); break;
    case 'scarf': drawScarf(g, fill, tone); break;
  }
  g.restore();
}
const pieceCache = new Map<string, string>();
/** Ilustración de una pieza como imagen (fichas y tarjetas de los paneles). */
export function pieceURL(key: string, it: Piece, px = 320): string {
  const k = key + '|' + px;
  const hit = pieceCache.get(k);
  if (hit) return hit;
  const [c, g] = canvas(px, px);
  g.scale(px / 100, px / 100);
  drawPiece(g, it, { shadow: true });
  const url = c.toDataURL();
  pieceCache.set(k, url);
  return url;
}
const swatchCache = new Map<string, string>();
/** Muestra cuadrada de un arte. */
export function swatchURL(spec: PatternSpec, px = 240): string {
  const k = spec.motif + spec.colors.join() + (spec.scale ?? '') + px;
  const hit = swatchCache.get(k);
  if (hit) return hit;
  const [c, g] = canvas(px, px);
  g.fillStyle = patternFill(g, spec, repFor(spec, px) * 0.9); g.fillRect(0, 0, px, px);
  const url = c.toDataURL();
  swatchCache.set(k, url);
  return url;
}

/* ---------------- iconos (SVG de trazo, 24×24) ---------------- */
const ICON_PATHS: Record<string, string> = {
  washer: '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><circle cx="12" cy="13.5" r="4.6"/><path d="M8.6 14.6c1.6-1.5 3.2 1.2 6.6-.6M7 6h3M15.5 6h.01M17.8 6h.01"/>',
  hanger: '<path d="M12 8.5V7.2a2.3 2.3 0 1 0-2.3-2.3"/><path d="M12 8.5 3.6 15.8c-1 .9-.4 2.7 1 2.7h14.8c1.4 0 2-1.8 1-2.7z"/>',
  key: '<circle cx="7.5" cy="12" r="4"/><path d="M11.5 12H21M17 12v3.5M20 12v2.5"/>',
  frame: '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><rect x="7.5" y="7.5" width="9" height="9"/><path d="M7.5 14l3-3 2.5 2.5 1.5-1.5 2 2"/>',
  book: '<path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5V19.5"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6.5L20.5 7"/>',
  truck: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.2v3.3h-7z"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  back: '<path d="M9 6 4.5 10.5 9 15"/><path d="M4.5 10.5H15a4.5 4.5 0 0 1 0 9h-3"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  bag: '<path d="M5 8.5h14l-1 12H6z"/><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5"/>',
  smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c1 1.5 2.2 2.2 3.5 2.2s2.5-.7 3.5-2.2M9 10h.01M15 10h.01"/>',
  sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3 7 7M17 17l1.7 1.7M5.3 18.7 7 17M17 7l1.7-1.7"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  sock: '<path d="M9 3h6v9.5l-4.5 4.5a3.2 3.2 0 0 1-4.5-4.5L9 9.5zM9 6.5h6"/>',
  chat: '<path d="M4 5.5h16v10.5H10l-4.5 3.5V16H4z"/>',
  home: '<path d="M4 11 12 4l8 7v9h-5.5v-5.5h-5V20H4z"/>',
};
export function icon(name: string): string {
  const d = ICON_PATHS[name] ?? '';
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
