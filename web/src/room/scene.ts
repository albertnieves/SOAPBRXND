/*
 * La lavandería: paredes, suelo y muebles. Cada mueble se dibuja una vez en su propio
 * sprite (vectorial, a la resolución de la pantalla); lo que se mueve se pinta encima en `live`.
 */
import type { RoomArtwork, RoomData, RoomItem, RoomWasher } from '@/modules/catalog/room';
import { artTone, drawPiece, patternFill, repFor } from './art';
import { IRI } from './chars';
import { NEON_BOX, NEON_PATHS } from './neon';
import {
  box, COLS, cyl, ellipse, FONT_PX, FONT_SANS, hull, INK, lgrad, litFace, mix, onFloor, onX, onY, P, poly, rgrad, rng, ROWS, rrect, seg,
  shade, sprite, TAU, TH, TILE_BAND, TW, vgrad, WALL, xFace, yFace, zFace, type G, type Pt, type Sprite,
} from './core';
import { PHASE_LABEL, washerStatus, type Daylight, type Tile } from './logic';

export type Env = { lightsOn: boolean; sky: Daylight; res: number; socks: readonly number[] };
export type Light = { x: number; y: number; rx: number; ry: number; color: string; on: number; off: number; flicker?: boolean };
export type Item = {
  id: string;
  label?: string;
  /** Etiqueta fija sobre el mueble; `null` para no enseñarla nunca. */
  tag?: string | null;
  /** La etiqueta solo sale al pasar por encima. */
  quiet?: boolean;
  wall?: boolean;
  box: [number, number, number, number];
  blocks: Tile[];
  use?: Tile;
  act?: string;
  spr: Sprite;
  live?: (g: G, t: number) => void;
  jig?: (t: number) => number;
  /** Desempate de profundidad para lo que va posado sobre otro mueble. */
  bias?: number;
  shadow?: boolean;
  mask?: { w: number; h: number; k: number; a: Uint8Array };
  /** Capa que emite luz (neón): se suma encima del tinte de la sala. */
  glow?: Sprite;
};
export type Scene = {
  bg: Sprite; items: Item[]; lights: Light[]; clip: Pt[]; blocked: Set<string>;
  seats: { x: number; y: number; z: number }[]; daniel: [number, number]; spawn: [number, number];
};

const C = {
  wallR: '#2e2e38', wallL: '#25252e', tile: '#ece8df', grout: '#d3cdc0', cream: '#e8e0d0', floorL: '#ece6da', floorD: '#212127',
  wood: '#c9a171', woodD: '#8f6d48', metal: '#9a9aa4', lilac: '#7a64c4', enamel: '#f4f1ea', neon: '#9be7ff', warm: '#c9b99a',
};
export const SOCK_SPOTS: { at: [number, number, number]; near: Tile; col: string }[] = [
  { at: [2.62, 0.5, 94], near: [2, 1], col: IRI[2] },
  { at: [4.86, 5.52, 96], near: [5, 6], col: IRI[0] },
  { at: [10.42, 5.86, 42], near: [10, 6], col: IRI[1] },
  { at: [0.55, 9.45, 0], near: [1, 9], col: '#ffd36b' },
  { at: [6.72, 0.42, 48], near: [6, 1], col: '#8ff0a4' },
];

function fit(g: G, text: string, weight: number, size: number, maxW: number, family = FONT_SANS) {
  g.font = `${weight} ${size}px ${family}`;
  const w = g.measureText(text).width;
  if (w > maxW) g.font = `${weight} ${(size * maxW) / w}px ${family}`;
}
function label(g: G, text: string, x: number, y: number, col: string, weight: number, size: number, maxW: number, family = FONT_SANS, align: CanvasTextAlign = 'center') {
  fit(g, text, weight, size, maxW, family);
  g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(text, x, y);
}
const glow = (g: G, col: string, blur: number) => { g.shadowColor = col; g.shadowBlur = blur; };

/* ================= fondo: paredes y suelo ================= */
function sky(g: G, w: number, h: number, light: Daylight) {
  const stops: [number, string][] = light === 'dia' ? [[0, '#6fc3ff'], [1, '#d6efff']] : light === 'tarde' ? [[0, '#2e2f6e'], [0.55, '#e9837a'], [1, '#ffd9a0']] : [[0, '#070a22'], [1, '#232b63']];
  g.fillStyle = vgrad(g, 0, h, stops); g.fillRect(0, 0, w, h);
  const r = rng(7);
  if (light === 'noche') {
    for (let i = 0; i < 22; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; g.fillRect(r() * w, r() * h * 0.55, 1, 1); }
    ellipse(g, w * 0.74, h * 0.2, 7, 7, '#fdf6d8'); ellipse(g, w * 0.74 + 3, h * 0.2 - 2, 6, 6, '#141a48');
  } else if (light === 'dia') {
    ellipse(g, w * 0.22, h * 0.2, 7, 7, '#fff6c9');
    g.fillStyle = 'rgba(255,255,255,.85)';
    [[0.55, 0.3, 11], [0.68, 0.34, 8], [0.3, 0.52, 9]].forEach(([x, y, s]) => { ellipse(g, w * x!, h * y!, s!, s! * 0.42, 'rgba(255,255,255,.85)'); ellipse(g, w * x! + s! * 0.7, h * y! + 1, s! * 0.7, s! * 0.34, 'rgba(255,255,255,.85)'); });
  } else ellipse(g, w * 0.3, h * 0.72, 9, 9, '#ffe9a8');
  // la ciudad
  const far = light === 'dia' ? '#9fb8cf' : light === 'tarde' ? '#5b3f6b' : '#141a3e';
  const near = light === 'dia' ? '#6f8aa6' : light === 'tarde' ? '#33274f' : '#0b0f2a';
  let x = -2;
  while (x < w) { const bw = 7 + r() * 9, bh = h * (0.18 + r() * 0.2); g.fillStyle = far; g.fillRect(x, h - bh, bw, bh); x += bw + 1; }
  x = -3;
  while (x < w) {
    const bw = 9 + r() * 10, bh = h * (0.1 + r() * 0.22); g.fillStyle = near; g.fillRect(x, h - bh, bw, bh);
    if (light !== 'dia') for (let wy = h - bh + 3; wy < h - 3; wy += 5) for (let wx = x + 2; wx < x + bw - 2; wx += 4) if (r() < 0.45) { g.fillStyle = r() < 0.7 ? '#ffd98a' : '#9be7ff'; g.fillRect(wx, wy, 1.6, 2.2); }
    x += bw + 1;
  }
}

function drawWalls(g: G, env: Env, data: RoomData) {
  const r = rng(11), RW = COLS * TW, LW2 = ROWS * TW, bandTop = WALL - TILE_BAND;
  const wall = (w: number, base: string, grout: string, tile: string) => {
    g.fillStyle = vgrad(g, 0, bandTop, [[0, shade(base, -0.28)], [1, base]]); g.fillRect(0, 0, w, bandTop);
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 1;
    for (let u = TW; u < w; u += TW) { g.beginPath(); g.moveTo(u, 6); g.lineTo(u, bandTop - 4); g.stroke(); }
    // zócalo de azulejo
    g.fillStyle = tile; g.fillRect(0, bandTop, w, TILE_BAND);
    for (let row = 0; row < 6; row++) for (let u = 0; u < w; u += 16) {
      const k = r();
      if (row === 0) { if ((u / 16) % 2 === 0) { g.fillStyle = '#1d1d22'; g.fillRect(u, bandTop, 16, 16); } }
      else if (k < 0.16) { g.fillStyle = k < 0.08 ? 'rgba(255,255,255,.22)' : 'rgba(120,105,80,.07)'; g.fillRect(u, bandTop + row * 16, 16, 16); }
    }
    g.strokeStyle = grout; g.lineWidth = 1;
    for (let v = bandTop; v <= WALL; v += 16) { g.beginPath(); g.moveTo(0, v); g.lineTo(w, v); g.stroke(); }
    for (let u = 0; u <= w; u += 16) { g.beginPath(); g.moveTo(u, bandTop); g.lineTo(u, WALL); g.stroke(); }
    g.fillStyle = vgrad(g, bandTop, WALL, [[0, 'rgba(255,255,255,.1)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.2)']]); g.fillRect(0, bandTop, w, TILE_BAND);
    g.fillStyle = INK; g.fillRect(0, bandTop - 3, w, 3); g.fillRect(0, WALL - 5, w, 5);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, bandTop - 4, w, 1);
  };
  onY(g, 0, 0, WALL, () => {
    wall(RW, C.wallR, C.grout, C.tile);
    g.fillStyle = lgrad(g, 0, 0, 70, 0, [[0, 'rgba(0,0,0,.34)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, 0, 70, WALL);
    // tubería
    g.fillStyle = vgrad(g, 12, 19, [[0, '#b9b9c4'], [0.5, '#7b7b88'], [1, '#3f3f49']]); g.fillRect(8, 12, RW - 8, 7);
    g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(8, 12, RW - 8, 7);
    for (let u = 44; u < RW; u += 96) { g.fillStyle = '#5b5b66'; g.fillRect(u, 9, 6, 13); g.strokeRect(u, 9, 6, 13); }
    // rótulo de letras retroiluminadas
    const cx = 1.05 * TW + (3.9 * TW) / 2;
    g.save();
    fit(g, 'SOAPBRXND', 700, 46, 3.9 * TW - 6);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    glow(g, env.lightsOn ? 'rgba(255,238,205,.55)' : 'rgba(255,238,205,.95)', env.lightsOn ? 14 : 22);
    g.fillStyle = '#0c0c0f'; g.fillText('SOAPBRXND', cx + 2, 58);
    g.fillStyle = '#fbf6ea'; g.fillText('SOAPBRXND', cx, 56);
    g.restore();
    label(g, 'LAVANDERÍA DE DROPS · ABIERTA 24 H', cx, 86, C.warm, 400, 9.5, 3.9 * TW - 10, FONT_PX);
    // pompas pintadas
    [[20, 40, 5], [34, 62, 3.4], [228, 96, 4], [246, 82, 2.6]].forEach(([x, y, rad], i) => { ellipse(g, x!, y!, rad!, rad!, 'rgba(255,255,255,.04)', IRI[i % 3]!, 1.3); ellipse(g, x! - rad! * 0.35, y! - rad! * 0.35, rad! * 0.2, rad! * 0.2, '#ffffff'); });
    // ventana
    const wx = 5.3 * TW, ww = 1.62 * TW, wy = 38, wh = 104;
    g.fillStyle = '#17171b'; g.fillRect(wx - 6, wy - 6, ww + 12, wh + 14);
    g.fillStyle = C.cream; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    g.save(); g.beginPath(); g.rect(wx, wy, ww, wh); g.clip(); g.translate(wx, wy); sky(g, ww, wh, env.sky); g.restore();
    g.fillStyle = lgrad(g, wx, wy, wx + ww, wy + wh, [[0, 'rgba(255,255,255,.3)'], [0.3, 'rgba(255,255,255,0)'], [0.55, 'rgba(255,255,255,.12)'], [0.6, 'rgba(255,255,255,0)']]); g.fillRect(wx, wy, ww, wh);
    g.fillStyle = C.cream; g.fillRect(wx + ww / 2 - 1.5, wy, 3, wh); g.fillRect(wx, wy + wh * 0.42, ww, 3);
    g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(wx - 4, wy - 4, ww + 8, wh + 8); g.strokeRect(wx, wy, ww, wh);
    g.fillStyle = C.cream; g.fillRect(wx - 8, wy + wh + 4, ww + 16, 5); g.strokeRect(wx - 8, wy + wh + 4, ww + 16, 5);
    // estante de detrás del mostrador (debajo va el neón)
    const sx = 8.35 * TW, sw = 3.4 * TW;
    [56].forEach((v, row) => {
      const rr = rng(40 + row);
      let u = sx + 6;
      while (u < sx + sw - 16) {
        const it = data.items[Math.floor(rr() * Math.max(1, data.items.length))];
        const kind = rr();
        if (kind < 0.55 && it) { // pila de prendas dobladas
          const n = 2 + Math.floor(rr() * 3), bw = 20;
          for (let i = 0; i < n; i++) {
            const piece = data.items[(Math.floor(rr() * 97) + i) % data.items.length]!;
            rrect(g, u, v - 6 - i * 6, bw, 6, 2); g.fillStyle = patternFill(g, piece.pattern, 7); g.fill();
            g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(u + bw - 5, v - 6 - i * 6, 5, 6); g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
          }
          u += bw + 7;
        } else if (kind < 0.8) { // caja de detergente
          const bh = 16 + rr() * 8, col = [C.lilac, '#f4b8c9', C.neon, '#ffd36b'][Math.floor(rr() * 4)]!;
          g.fillStyle = col; g.fillRect(u, v - bh, 13, bh); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(u + 2, v - bh + 4, 9, 5);
          g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(u, v - bh, 13, bh); u += 18;
        } else { // botella
          const col = [C.neon, '#f4b8c9', '#8ff0a4'][Math.floor(rr() * 3)]!;
          rrect(g, u, v - 17, 9, 17, 2.5); g.fillStyle = col; g.fill(); g.strokeStyle = INK; g.lineWidth = 1; g.stroke();
          g.fillStyle = INK; g.fillRect(u + 2.5, v - 21, 4, 4); u += 14;
        }
      }
      g.fillStyle = vgrad(g, v, v + 5, [[0, C.wood], [1, C.woodD]]); g.fillRect(sx, v, sw, 5);
      g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(sx, v, sw, 5);
      g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(sx + 2, v + 5, sw, 4);
      [sx + 14, sx + sw - 20].forEach((bx) => { g.fillStyle = '#3a3a42'; g.beginPath(); g.moveTo(bx, v + 5); g.lineTo(bx + 6, v + 5); g.lineTo(bx, v + 15); g.closePath(); g.fill(); });
    });
    // pizarra de tarifas
    const px = 7.12 * TW;
    g.fillStyle = '#17171b'; g.fillRect(px, 28, 46, 30); g.strokeStyle = C.warm; g.lineWidth = 1.5; g.strokeRect(px, 28, 46, 30);
    label(g, 'TALLAS', px + 23, 36, '#f2f0eb', 700, 7, 40, FONT_PX);
    label(g, 'S · M · L · XL', px + 23, 47, C.neon, 400, 6.5, 40, FONT_PX);
  });
  onX(g, 0, ROWS, WALL, () => {
    wall(LW2, C.wallL, shade(C.grout, -0.08), shade(C.tile, -0.07));
    g.fillStyle = lgrad(g, LW2 - 70, 0, LW2, 0, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.36)']]); g.fillRect(LW2 - 70, 0, 70, WALL);
    const U = (y: number) => (ROWS - y) * TW;
    // barra de luz sobre los cuadros
    g.fillStyle = vgrad(g, 24, 29, [[0, '#d9b36a'], [1, '#8a6a2c']]); g.fillRect(U(6.55), 24, 3.1 * TW, 5); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(U(6.55), 24, 3.1 * TW, 5);
    g.fillStyle = lgrad(g, 0, 29, 0, 150, [[0, 'rgba(255,236,190,.16)'], [1, 'rgba(255,236,190,0)']]);
    g.beginPath(); g.moveTo(U(6.55), 29); g.lineTo(U(6.55) + 3.1 * TW, 29); g.lineTo(U(6.55) + 3.1 * TW + 10, 150); g.lineTo(U(6.55) - 10, 150); g.closePath(); g.fill();
    // cartel de normas
    const nx = U(7.38);
    g.fillStyle = '#fbfaf6'; g.fillRect(nx, 50, 30, 42); g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(nx, 50, 30, 42);
    label(g, 'NORMAS', nx + 15, 58, INK, 700, 6, 26, FONT_PX);
    g.fillStyle = '#8b8678'; for (let i = 0; i < 5; i++) g.fillRect(nx + 4, 65 + i * 5, i === 4 ? 12 : 22, 1.6);
    ellipse(g, nx + 15, 50, 1.8, 1.8, '#d93f44', INK, 0.8);
  });
  // remates de las paredes
  poly(g, [P(0, 0, WALL), P(COLS, 0, WALL), P(COLS, -0.22, WALL), P(-0.22, -0.22, WALL), P(-0.22, ROWS, WALL), P(0, ROWS, WALL)], C.cream, INK);
  poly(g, [P(0, ROWS, -14), P(-0.22, ROWS, -14), P(-0.22, ROWS, WALL), P(0, ROWS, WALL)], shade(C.cream, -0.3), INK);
  poly(g, [P(COLS, 0, -14), P(COLS, -0.22, -14), P(COLS, -0.22, WALL), P(COLS, 0, WALL)], shade(C.cream, -0.16), INK);
  seg(g, P(0, 0, 0), P(0, 0, WALL), 'rgba(0,0,0,.5)', 2);
}

function drawFloor(g: G) {
  const r = rng(3);
  litFace(g, yFace(0, COLS, ROWS, -14, 0), '#17171b', 0.4, INK);
  litFace(g, xFace(COLS, 0, ROWS, -14, 0), '#232329', 0.4, INK);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const dark = (x + y) % 2 === 1, k = (r() - 0.5) * 0.05;
    poly(g, zFace(x, y, x + 1, y + 1, 0), shade(dark ? C.floorD : C.floorL, dark ? Math.abs(k) : k));
  }
  // juntas y brillo del canto
  g.lineCap = 'butt';
  for (let i = 0; i <= COLS; i++) seg(g, P(i, 0), P(i, ROWS), 'rgba(0,0,0,.28)', 1);
  for (let i = 0; i <= ROWS; i++) seg(g, P(0, i), P(COLS, i), 'rgba(0,0,0,.28)', 1);
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const hi = (x + y) % 2 === 1 ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.55)';
    const a = P(x + 0.03, y + 0.03), b = P(x + 0.97, y + 0.03), c = P(x + 0.03, y + 0.97);
    seg(g, a, b, hi, 1); seg(g, a, c, hi, 1);
  }
  const floor = zFace(0, 0, COLS, ROWS, 0);
  // sombra de las paredes y foco general
  g.save(); poly(g, floor); g.clip();
  poly(g, [P(0, 0), P(COLS, 0), P(COLS, 0.7), P(0.7, 0.7), P(0.7, ROWS), P(0, ROWS)], 'rgba(0,0,0,.12)');
  poly(g, [P(0, 0), P(COLS, 0), P(COLS, 0.28), P(0.28, 0.28), P(0.28, ROWS), P(0, ROWS)], 'rgba(0,0,0,.16)');
  const [cx, cy] = P(5.6, 4.8);
  g.save(); g.translate(cx, cy); g.scale(1, 0.5);
  g.fillStyle = rgrad(g, 0, 0, 40, 620, [[0, 'rgba(255,244,214,.16)'], [0.45, 'rgba(255,244,214,0)'], [0.72, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.34)']]);
  g.fillRect(-700, -900, 1400, 1800); g.restore();
  // reflejo pulido
  g.globalAlpha = 0.5;
  for (let i = 0; i < 5; i++) { const x0 = 1.5 + i * 2.1; poly(g, [P(x0, 0.4), P(x0 + 0.5, 0.4), P(x0 + 0.5 - 4, ROWS), P(x0 - 4.4, ROWS)], 'rgba(255,255,255,.035)'); }
  g.globalAlpha = 1;
  g.restore();
  poly(g, floor, null, INK, 1.5);
}

function drawRugs(g: G) {
  // alfombra redonda
  onFloor(g, 5.6, 3.6, 0, () => {
    ellipse(g, 0, 0, 78, 78, '#17171b', INK, 1.5);
    ellipse(g, 0, 0, 71, 71, C.cream);
    ellipse(g, 0, 0, 60, 60, null, '#17171b', 3);
    ellipse(g, 0, 0, 52, 52, null, C.lilac, 1.4);
    g.save(); g.rotate(-Math.PI / 4);
    label(g, 'SBX', 0, 2, '#17171b', 700, 44, 86);
    g.restore();
    [[-34, -30, 7], [36, 28, 5], [30, -36, 3.5]].forEach(([x, y, rad], i) => ellipse(g, x!, y!, rad!, rad!, null, IRI[i]!, 2));
    for (let a = 0; a < 40; a++) { const an = (a / 40) * TAU; seg(g, [Math.cos(an) * 78, Math.sin(an) * 78], [Math.cos(an) * 84, Math.sin(an) * 84], 'rgba(23,23,27,.65)', 1.4); }
  });
  // felpudo de la puerta
  onFloor(g, 0.12, 7.72, 0, () => {
    rrect(g, 0, 0, 42, 56, 3); g.fillStyle = '#3a2f26'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
    for (let v = 5; v < 56; v += 4) { g.beginPath(); g.moveTo(3, v); g.lineTo(39, v); g.stroke(); }
    g.save(); g.translate(21, 28); g.rotate(-Math.PI / 2); label(g, 'HOLA', 0, 0, C.cream, 700, 15, 46); g.restore();
  });
}

/* ================= muebles ================= */
type Def = Omit<Item, 'spr' | 'blocks'> & { blocks?: Tile[] };
function build(env: Env, data: RoomData): { items: Item[]; lights: Light[]; seats: Scene['seats'] } {
  const items: Item[] = [];
  const lights: Light[] = [];
  const add = (def: Def, b: [number, number, number, number], draw: (g: G) => void) => {
    const it: Item = { blocks: [], ...def, spr: sprite(b[0], b[1], b[2], b[3], env.res, draw) };
    items.push(it); return it;
  };
  /** Mueble de suelo: su caja envolvente sale de la huella y la altura. */
  const floor = (def: Def, h: number, draw: (g: G) => void, pad = 8) => add(def, hull(def.box[0], def.box[1], def.box[2], def.box[3], h, pad), draw);
  /** Algo colgado en la pared izquierda entre y0..y1 y z0..z1; se dibuja en el plano (u a la derecha). */
  const leftWall = (def: Def, y0: number, y1: number, z0: number, z1: number, draw: (g: G, w: number, h: number) => void) => {
    const a = P(0, y1, z0), b = P(0, y0, z1);
    return add({ wall: true, ...def }, [a[0] - 8, b[1] - 8, b[0] + 8, a[1] + 8], (g) => onX(g, 0, y1, z1, () => draw(g, (y1 - y0) * TW, z1 - z0)));
  };
  const rightWall = (def: Def, x0: number, x1: number, z0: number, z1: number, draw: (g: G, w: number, h: number) => void) => {
    const a = P(x0, 0, z1), b = P(x1, 0, z0);
    return add({ wall: true, ...def }, [a[0] - 8, a[1] - 8, b[0] + 8, b[1] + 8], (g) => onY(g, x0, 0, z1, () => draw(g, (x1 - x0) * TW, z1 - z0)));
  };
  const byDrop = (n: string) => data.items.filter((i) => i.dropNumber === n);

  /* --- pared izquierda: neón, cuadros, interruptor, puerta --- */
  const neon = leftWall({ id: 'neon', box: [0, 1.1, 0.02, 3.3] }, 1.05, 3.35, 204, 246, (g, w, h) => {
    rrect(g, 0, 2, w, h - 4, 6); g.fillStyle = '#15151a'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
    g.save();
    fit(g, 'ABIERTO', 700, 28, w - 18); g.textAlign = 'center'; g.textBaseline = 'middle';
    glow(g, C.neon, 10); g.strokeStyle = C.neon; g.lineWidth = 2.2; g.lineJoin = 'round'; g.strokeText('ABIERTO', w / 2, h / 2 + 1);
    g.shadowBlur = 0; g.strokeStyle = '#f2fdff'; g.lineWidth = 0.8; g.strokeText('ABIERTO', w / 2, h / 2 + 1);
    g.restore();
  });
  neon.live = (g, t) => { // parpadeo ocasional
    if ((t % 7.3) > 0.16 || (t % 0.08) < 0.04) return;
    g.save(); g.globalAlpha = 0.55; poly(g, xFace(0.01, 1.1, 3.3, 206, 244), '#15151a'); g.restore();
  };
  { const [x, y] = P(0, 2.2, 225); lights.push({ x, y, rx: 150, ry: 90, color: C.neon, on: 0.1, off: 0.3, flicker: true }); }

  const frames = ['#1d1d21', '#8f6d48', '#f2f0eb', '#8f6d48', '#1d1d21', '#d9b36a'];
  data.artworks.slice(0, 6).forEach((art: RoomArtwork, i) => {
    const col = i % 3, row = Math.floor(i / 3), yc = 6.02 - col * 1.0, zc = row ? 132 : 188, fw = 36 + (i % 2 ? 4 : 0), fh = 44 - (i % 2 ? 6 : 0);
    const y0 = yc - fw / 2 / TW, y1 = yc + fw / 2 / TW;
    leftWall({ id: 'art-' + art.slug, label: `${art.kindLabel.toUpperCase()} · ${art.name}`, tag: i === 1 ? 'ARTES' : undefined, quiet: i !== 1, box: [0, y0, 0.02, y1], use: [1, Math.round(yc - 0.5)], act: 'art:' + art.slug },
      y0, y1, zc - fh / 2, zc + fh / 2, (g, w, h) => {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(3, 4, w, h);
        g.fillStyle = frames[i]!; g.fillRect(0, 0, w, h); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(0, 0, w, h);
        g.fillStyle = '#fbfaf6'; g.fillRect(3.5, 3.5, w - 7, h - 7);
        g.fillStyle = patternFill(g, art.pattern, Math.max(9, repFor(art.pattern, 60))); g.fillRect(7, 7, w - 14, h - 14);
        g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.8; g.strokeRect(7, 7, w - 14, h - 14);
        g.fillStyle = lgrad(g, 0, 0, w, h, [[0, 'rgba(255,255,255,.3)'], [0.36, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.1)']]); g.fillRect(3.5, 3.5, w - 7, h - 7);
      });
  });

  leftWall({ id: 'switch', label: env.lightsOn ? 'INTERRUPTOR · LUZ DE AMBIENTE' : 'INTERRUPTOR · LUZ DE DÍA', quiet: true, tag: 'LUZ', box: [0, 6.85, 0.02, 7.1], use: [1, 7], act: 'lights' },
    6.86, 7.08, 106, 124, (g, w, h) => {
      rrect(g, 0, 0, w, h, 2.5); g.fillStyle = '#f2f0eb'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke();
      rrect(g, w / 2 - 2.6, 4, 5.2, h - 8, 2); g.fillStyle = '#c9c4b8'; g.fill(); g.stroke();
      g.fillStyle = env.lightsOn ? '#8ff0a4' : '#3a3a42'; g.fillRect(w / 2 - 2, env.lightsOn ? 4.8 : h - 9.6, 4, 4.8);
    });

  leftWall({ id: 'door', label: 'SALIDA · TIENDA CLÁSICA', tag: 'SALIDA', quiet: true, box: [0, 7.6, 0.02, 9.0], use: [0, 8], act: 'exit' }, 7.55, 9.05, 0, 206, (g, w, h) => {
    const top = h - 178;
    g.fillStyle = C.cream; g.fillRect(0, top, w, 178); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(0, top, w, 178);
    g.fillStyle = '#1d1d22'; g.fillRect(6, top + 6, w - 12, 172);
    g.fillStyle = vgrad(g, top + 12, h - 30, env.sky === 'dia' ? [[0, '#9fd6ff'], [1, '#dff1ff']] : env.sky === 'tarde' ? [[0, '#3b3a78'], [1, '#f2a07e']] : [[0, '#0a0e2a'], [1, '#1f2759']]);
    g.fillRect(11, top + 12, w - 22, 136);
    g.fillStyle = env.sky === 'dia' ? 'rgba(90,110,130,.5)' : 'rgba(8,10,26,.7)'; g.fillRect(11, top + 118, w - 22, 30);
    g.fillStyle = lgrad(g, 11, top, w - 11, top + 136, [[0, 'rgba(255,255,255,.34)'], [0.34, 'rgba(255,255,255,0)'], [0.5, 'rgba(255,255,255,.12)'], [0.58, 'rgba(255,255,255,0)']]); g.fillRect(11, top + 12, w - 22, 136);
    g.strokeRect(11, top + 12, w - 22, 136);
    g.fillStyle = '#17171b'; g.fillRect(11, h - 24, w - 22, 16);
    rrect(g, w - 22, top + 78, 4, 34, 2); g.fillStyle = '#c9c9d2'; g.fill(); g.stroke();
    // rótulo de salida
    g.save(); glow(g, '#8ff0a4', 9);
    rrect(g, w / 2 - 22, 2, 44, 17, 3); g.fillStyle = '#0e2a18'; g.fill(); g.restore();
    g.strokeStyle = INK; g.lineWidth = 1.3; rrect(g, w / 2 - 22, 2, 44, 17, 3); g.stroke();
    label(g, 'SALIDA', w / 2, 11, '#8ff0a4', 700, 9.5, 38, FONT_PX);
  });
  { const [x, y] = P(0.4, 8.3, 150); lights.push({ x, y, rx: 70, ry: 60, color: '#8ff0a4', on: 0.05, off: 0.16 }); }

  /* --- pared derecha: neón rojo detrás de Daniel --- */
  {
    const RED = '#ff2338', x0 = 8.12, x1 = 11.86, z0 = 106, z1 = 180;
    const paths = typeof Path2D === 'undefined' ? [] : NEON_PATHS.map((d) => new Path2D(d));
    /** Coloca el lettering centrado en la placa y llama a `fn` en unidades del SVG. */
    const inPlate = (g: G, w: number, h: number, fn: (s: number) => void) => {
      const [bx, by, bw, bh] = NEON_BOX, s = Math.min((w - 12) / bw, (h - 10) / bh);
      g.save(); g.translate((w - bw * s) / 2 - bx * s, (h - bh * s) / 2 - by * s); g.scale(s, s);
      g.lineJoin = 'round'; g.lineCap = 'round'; fn(s); g.restore();
    };
    const tubes = (g: G, s: number) => {
      glow(g, RED, 14); g.strokeStyle = 'rgba(255,35,56,.5)'; g.lineWidth = 2.2 / s; paths.forEach((p) => g.stroke(p));
      glow(g, RED, 5); g.fillStyle = RED; g.strokeStyle = RED; g.lineWidth = 1.1 / s; paths.forEach((p) => { g.stroke(p); g.fill(p); });
      g.shadowBlur = 0; g.fillStyle = '#ffb3ba'; paths.forEach((p) => g.fill(p));
    };
    const sign = rightWall({ id: 'neon-frase', box: [x0, 0, x1, 0.02] }, x0, x1, z0, z1, (g, w, h) => {
      // placa de metacrilato con sus cuatro tornillos
      rrect(g, 1, 1, w - 2, h - 2, 5); g.fillStyle = 'rgba(255,255,255,.035)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.stroke();
      [[6, 6], [w - 6, 6], [6, h - 6], [w - 6, h - 6]].forEach(([x, y]) => ellipse(g, x!, y!, 1.6, 1.6, '#c9c9d2', INK, 0.6));
      inPlate(g, w, h, (s) => {
        g.save(); g.translate(1.4 / s, 2 / s); g.fillStyle = 'rgba(0,0,0,.45)'; paths.forEach((p) => g.fill(p)); g.restore(); // sombra del tubo
        tubes(g, s);
      });
    });
    // los tubos dan luz propia: se vuelven a sumar después del tinte de la sala
    const w = (x1 - x0) * TW, h = z1 - z0, b = sign.spr;
    sign.glow = sprite(b.x, b.y, b.x + b.w, b.y + b.h, env.res, (g) => onY(g, x0, 0, z1, () => inPlate(g, w, h, (s) => tubes(g, s))));
    const [lx, ly] = P(10, 0.3, 140);
    lights.push({ x: lx, y: ly, rx: 170, ry: 80, color: RED, on: 0.07, off: 0.22 });
  }

  /* --- pared derecha: reloj --- */
  const clock = rightWall({ id: 'clock', box: [7.3, 0, 7.9, 0.02] }, 7.34, 7.94, 174, 204, (g, w, h) => {
    ellipse(g, w / 2 + 1.5, h / 2 + 2, 14, 14, 'rgba(0,0,0,.35)');
    ellipse(g, w / 2, h / 2, 14, 14, '#f7f5f0', INK, 2);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; seg(g, [w / 2 + Math.cos(a) * 10.5, h / 2 + Math.sin(a) * 10.5], [w / 2 + Math.cos(a) * 12, h / 2 + Math.sin(a) * 12], INK, i % 3 ? 0.8 : 1.6); }
  });
  clock.live = (g) => {
    const d = new Date(), hh = ((d.getHours() % 12) + d.getMinutes() / 60) / 12, mm = (d.getMinutes() + d.getSeconds() / 60) / 60, ss = d.getSeconds() / 60;
    onY(g, 7.34, 0, 204, () => {
      const cx = 0.3 * TW, cy = 15;
      const hand = (f: number, len: number, col: string, lw: number) => { const a = f * TAU - Math.PI / 2; seg(g, [cx, cy], [cx + Math.cos(a) * len, cy + Math.sin(a) * len], col, lw); };
      hand(hh, 6, INK, 2); hand(mm, 9.5, INK, 1.4); hand(ss, 10.5, '#d93f44', 0.8);
      ellipse(g, cx, cy, 1.4, 1.4, INK);
    });
  };

  /* --- planta de la esquina --- */
  const leaf = (g: G, x: number, y: number, len: number, wid: number, ang: number, col: string) => {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(wid, -len * 0.3, wid, -len * 0.8, 0, -len); g.bezierCurveTo(-wid, -len * 0.8, -wid, -len * 0.3, 0, 0); g.closePath();
    g.fillStyle = lgrad(g, -wid, 0, wid, 0, [[0, shade(col, 0.12)], [0.5, col], [1, shade(col, -0.25)]]); g.fill();
    g.strokeStyle = INK; g.lineWidth = 1.4; g.lineJoin = 'round'; g.stroke();
    g.beginPath(); g.moveTo(0, -2); g.lineTo(0, -len + 3); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.stroke();
    g.restore();
  };
  floor({ id: 'plant', box: [0.2, 0.2, 0.8, 0.8], blocks: [[0, 0]] }, 150, (g) => {
    cyl(g, 0.5, 0.5, 0, 0.2, 30, '#3a3a42');
    const [cx, cy] = P(0.5, 0.5, 30);
    ellipse(g, cx, cy, 11, 5, '#2a2018');
    const greens = ['#3f9a62', '#57b878', '#2f7d4d', '#6bc98a'];
    [[-0.95, 52, 13], [0.9, 56, 14], [-0.35, 78, 15], [0.35, 84, 16], [-1.35, 36, 11], [1.3, 40, 12], [0, 100, 15], [-0.65, 62, 12], [0.7, 66, 13]]
      .forEach(([a, len, wid], i) => leaf(g, cx + (a as number) * 3, cy - 2, len as number, wid as number, a as number, greens[i % 4]!));
  });

  /* --- probador --- */
  floor({ id: 'booth', label: 'VESTIDOR · VISTE A POMPA', tag: 'VESTIDOR', quiet: true, box: [0.06, 1.0, 0.96, 3.0], blocks: [[0, 1], [0, 2]], use: [1, 2], act: 'wardrobe' }, 204, (g) => {
    box(g, 0.06, 1.0, 0, 0.9, 2.0, 196, '#30303a', { left: '#2a2a33', right: '#22222a', top: '#3d3d48' });
    onX(g, 0.96, 3.0, 196, () => { // frente con cortina
      const w = 2 * TW;
      g.fillStyle = '#101014'; g.fillRect(7, 30, w - 14, 162);
      for (let i = 0; i < 11; i++) {
        const u = 8 + i * ((w - 16) / 11), fw = (w - 16) / 11;
        g.fillStyle = lgrad(g, u, 0, u + fw, 0, [[0, '#5a47a0'], [0.4, '#8f7add'], [0.7, '#7a64c4'], [1, '#4a3990']]);
        g.beginPath(); g.moveTo(u, 30); g.lineTo(u + fw, 30); g.lineTo(u + fw, 186 - (i % 2) * 2); g.quadraticCurveTo(u + fw / 2, 191, u, 186 - ((i + 1) % 2) * 2); g.closePath(); g.fill();
      }
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(7, 30, w - 14, 9);
      g.fillStyle = vgrad(g, 27, 32, [[0, '#d0d0da'], [1, '#70707c']]); g.fillRect(5, 27, w - 10, 4.5); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(5, 27, w - 10, 4.5);
      rrect(g, 6, 4, w - 12, 19, 3); g.fillStyle = '#17171b'; g.fill(); g.strokeStyle = C.warm; g.lineWidth = 1.2; g.stroke();
      label(g, 'VESTIDOR', w / 2, 14, '#fbf6ea', 700, 13, w - 44);
      for (const u of [13, w - 13]) { g.save(); glow(g, '#ffe9a8', 7); ellipse(g, u, 13.5, 3, 3, '#fff3c4'); g.restore(); }
    });
    onY(g, 0.06, 3.0, 196, () => { // lateral con espejo
      const w = 0.9 * TW;
      rrect(g, 7, 34, w - 14, 124, 12); g.fillStyle = '#d9b36a'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
      rrect(g, 9.5, 36.5, w - 19, 119, 10); g.fillStyle = lgrad(g, 0, 36, w, 156, [[0, '#eaf6ff'], [0.5, '#a9c8e0'], [1, '#7ea3bf']]); g.fill();
      g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(8, 96); g.lineTo(w, 44); g.lineTo(w, 56); g.lineTo(8, 110); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.moveTo(8, 118); g.lineTo(w, 66); g.lineTo(w, 70); g.lineTo(8, 123); g.closePath(); g.fill(); g.restore();
    });
  });
  { const [x, y] = P(1.4, 2.0, 0); lights.push({ x, y, rx: 80, ry: 40, color: '#ffe9a8', on: 0.05, off: 0.14 }); }

  /* --- lavadoras: una por drop --- */
  data.washers.forEach((w: RoomWasher, i) => {
    const st = washerStatus(w), tx = 1 + i, x = tx + 0.07, y = 0.1, wd = 0.86, d = 0.82, h = 94, W = wd * TW;
    const mine = byDrop(w.number);
    const it = floor({ id: 'washer' + w.number, label: `LAVADORA ${w.number} · ${w.name} · ${PHASE_LABEL[w.phase] ?? ''}`, tag: i === Math.min(1, data.washers.length - 1) ? 'DROPS' : undefined, quiet: i !== Math.min(1, data.washers.length - 1),
      box: [x, y, x + wd, y + d], blocks: [[tx, 0]], use: [tx, 1], act: 'drop:' + w.slug }, h + 26, (g) => {
      for (const [fx, fy] of [[x + 0.06, y + d - 0.1], [x + wd - 0.14, y + d - 0.1], [x + wd - 0.14, y + 0.06]]) box(g, fx!, fy!, 0, 0.08, 0.08, 4, '#2a2a30');
      box(g, x, y, 4, wd, d, h - 4, C.enamel, { left: '#eeeae1', right: '#cfcabd', top: '#fbf9f4' });
      onY(g, x, y + d, h, () => {
        rrect(g, 3, 4, W - 6, 16, 3); g.fillStyle = '#26262d'; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
        rrect(g, 6, 7, 16, 10, 1.5); g.fillStyle = '#0a1a12'; g.fill();
        label(g, w.number, 14, 12.5, '#8ff0a4', 700, 8, 14, FONT_PX);
        ellipse(g, W - 9.5, 12, 4.6, 4.6, '#dedad0', INK, 1.1); seg(g, [W - 9.5, 12], [W - 9.5 + 2.6, 12 - 2.6], INK, 1.3);
        const led = { available: '#8ff0a4', coming: '#ffd36b', locked: '#ff6b6b', soldout: '#6a6a74' }[st];
        g.save(); glow(g, led, 5); ellipse(g, W - 19, 12, 1.8, 1.8, led); g.restore();
        // puerta
        const cx = W / 2, cy = 54;
        ellipse(g, cx, cy, 17, 17, lgrad(g, cx - 17, cy - 17, cx + 17, cy + 17, [[0, '#e6e6ee'], [0.5, '#9a9aa6'], [1, '#5c5c68']]), INK, 1.5);
        ellipse(g, cx, cy, 13.2, 13.2, st === 'soldout' ? '#1b1b20' : '#0e1118', INK, 1.3);
        rrect(g, cx + 14.5, cy - 4, 4, 8, 1.5); g.fillStyle = '#c9c9d2'; g.fill(); g.stroke();
        if (st === 'soldout') { for (let a = 0; a < 14; a++) { const an = (a / 14) * TAU; ellipse(g, cx + Math.cos(an) * 8, cy + Math.sin(an) * 8, 0.9, 0.9, '#3a3a44'); } }
        g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(2, h - 13, W - 4, 1.2);
        ellipse(g, 8, h - 7, 2.4, 2.4, '#d8d4ca', INK, 0.9);
        if (st === 'coming') { // cinta de «no pasar»
          g.save(); g.beginPath(); g.rect(0, 76, W, 8); g.clip();
          g.fillStyle = '#ffd36b'; g.fillRect(0, 76, W, 8); g.fillStyle = '#17171b';
          for (let u = -8; u < W; u += 9) { g.beginPath(); g.moveTo(u, 84); g.lineTo(u + 4.5, 84); g.lineTo(u + 12.5, 76); g.lineTo(u + 8, 76); g.closePath(); g.fill(); }
          g.restore(); g.strokeRect(0, 76, W, 8);
        }
        if (st === 'locked') { // cadena y candado
          g.setLineDash([3, 2.2]); seg(g, [3, 36], [W - 3, 72], '#8d8d97', 2.4); seg(g, [3, 72], [W - 3, 36], '#8d8d97', 2.4); g.setLineDash([]);
          g.beginPath(); g.arc(cx, cy - 4, 5, Math.PI, 0); g.strokeStyle = '#c9993a'; g.lineWidth = 2.6; g.stroke();
          rrect(g, cx - 8, cy - 4, 16, 13, 2.5); g.fillStyle = lgrad(g, cx - 8, 0, cx + 8, 0, [[0, '#ffe08a'], [1, '#d9a83a']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke();
          ellipse(g, cx, cy + 1, 1.8, 1.8, INK); g.fillStyle = INK; g.fillRect(cx - 0.8, cy + 1, 1.6, 4.5);
        }
        if (st === 'soldout') { g.save(); g.translate(cx, cy); g.rotate(-0.2); g.fillStyle = '#d93f44'; g.fillRect(-19, -5.5, 38, 11); g.strokeStyle = INK; g.strokeRect(-19, -5.5, 38, 11); label(g, 'AGOTADO', 0, 0.5, '#fbfaf6', 700, 7, 34, FONT_PX); g.restore(); }
      });
      // lo que hay encima
      if (i % 3 === 0) { box(g, x + 0.5, y + 0.2, h, 0.2, 0.2, 17, C.neon, { stroke: INK }); box(g, x + 0.55, y + 0.25, h + 17, 0.1, 0.1, 5, '#17171b'); }
      if (i % 3 === 2) [0, 1, 2].forEach((k) => box(g, x + 0.2, y + 0.2, h + k * 5, 0.42, 0.36, 5, ['#f4b8c9', C.cream, C.lilac][k]!));
    });
    const cols = (mine.length ? mine : data.items).slice(0, 5).map((m) => [artTone(m.pattern), m.pattern.colors[1] ?? m.color] as const);
    if (st === 'available') it.jig = (t) => Math.sin(t * 41) * 0.55;
    if (st === 'available' || st === 'coming') it.live = (g, t) => {
      onY(g, x, y + d, h, () => {
        const cx = W / 2, cy = 54, R = 12.6;
        g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();
        if (st === 'available') {
          g.fillStyle = '#16303f'; g.fillRect(cx - R, cy - R, R * 2, R * 2);
          cols.forEach(([a, b], k) => {
            const an = t * 4.2 + (k / cols.length) * TAU, rad = 5.6 + Math.sin(t * 3 + k) * 1.6;
            ellipse(g, cx + Math.cos(an) * rad, cy + Math.sin(an) * rad, 5.4, 3.6, a, 'rgba(0,0,0,.35)', 0.8, an + 1);
            ellipse(g, cx + Math.cos(an + 0.5) * rad * 0.8, cy + Math.sin(an + 0.5) * rad * 0.8, 2.2, 1.4, b, null, 0, an);
          });
          for (let k = 0; k < 6; k++) { const an = -t * 2.4 + k * 1.1; ellipse(g, cx + Math.cos(an) * (8 + (k % 3)), cy + Math.sin(an) * (8 + (k % 3)), 1.3, 1.3, 'rgba(255,255,255,.7)'); }
          g.fillStyle = 'rgba(120,200,235,.26)'; g.fillRect(cx - R, cy + 2 + Math.sin(t * 5) * 1.5, R * 2, R);
        } else {
          g.fillStyle = '#1b2a36'; g.fillRect(cx - R, cy - R, R * 2, R * 2);
          g.beginPath(); g.moveTo(cx - R, cy + R);
          for (let u = -R; u <= R; u += 2) g.lineTo(cx + u, cy + 1.5 + Math.sin(u * 0.5 + t * 2.4) * 1.4);
          g.lineTo(cx + R, cy + R); g.closePath(); g.fillStyle = '#7fc4de'; g.fill();
          for (let k = 0; k < 5; k++) { const yy = ((t * 5 + k * 5.3) % 13); ellipse(g, cx - 8 + k * 4 + Math.sin(t * 2 + k) * 1.2, cy + 12 - yy, 1.2, 1.2, 'rgba(255,255,255,.8)'); }
        }
        g.restore();
        g.beginPath(); g.arc(cx, cy, R - 2.6, Math.PI * 1.08, Math.PI * 1.5); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.lineCap = 'round'; g.stroke();
      });
    };
    if (st === 'available' || st === 'coming') { const [lx, ly] = P(tx + 0.5, 1.5, 0); lights.push({ x: lx, y: ly, rx: 46, ry: 23, color: st === 'available' ? '#9be7ff' : '#ffd36b', on: 0.06, off: 0.22 }); }
  });

  /* --- carro de la colada (si sobra hueco de lavadora) --- */
  if (data.washers.length < 4) {
    const cx0 = 1 + data.washers.length + 0.14;
    floor({ id: 'cart', label: 'CARRO DE LA COLADA', box: [cx0, 0.14, cx0 + 0.72, 0.86], blocks: [[1 + data.washers.length, 0]] }, 66, (g) => {
      for (const [a, b] of [[cx0 + 0.04, 0.8], [cx0 + 0.62, 0.8], [cx0 + 0.62, 0.2]]) { const [wx, wy] = P(a!, b!, 4); ellipse(g, wx, wy, 3.4, 3.4, '#2a2a30', INK, 1.2); }
      box(g, cx0, 0.14, 8, 0.72, 0.72, 34, '#d8d8e0', { left: '#c2c2cc', right: '#9c9ca8', top: '#3a3a44' });
      g.strokeStyle = 'rgba(23,23,27,.4)'; g.lineWidth = 1;
      for (let k = 1; k < 6; k++) { seg(g, P(cx0 + k * 0.12, 0.86, 8), P(cx0 + k * 0.12, 0.86, 42), 'rgba(23,23,27,.35)', 1); seg(g, P(cx0 + 0.72, 0.14 + k * 0.12, 8), P(cx0 + 0.72, 0.14 + k * 0.12, 42), 'rgba(23,23,27,.35)', 1); }
      const [px, py] = P(cx0 + 0.36, 0.5, 44);
      data.items.slice(0, 4).forEach((m, k) => { g.save(); g.translate(px - 12 + k * 8, py - 2 - (k % 2) * 5); g.rotate(-0.3 + k * 0.25); rrect(g, -9, -6, 18, 12, 5); g.fillStyle = patternFill(g, m.pattern, 8); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); g.restore(); });
    });
  }

  /* --- aparador bajo la ventana --- */
  floor({ id: 'sideboard', box: [5.12, 0.1, 6.94, 0.74], blocks: [[5, 0], [6, 0]] }, 86, (g) => {
    box(g, 5.12, 0.1, 0, 1.82, 0.64, 46, C.wood, { left: C.wood, right: C.woodD, top: shade(C.wood, 0.14) });
    onY(g, 5.12, 0.74, 46, () => {
      const w = 1.82 * TW; g.strokeStyle = INK; g.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) { const u = 4 + k * ((w - 8) / 3); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(u, 5, (w - 8) / 3 - 3, 36); g.strokeRect(u, 5, (w - 8) / 3 - 3, 36); ellipse(g, u + (w - 8) / 6 - 1.5, 23, 1.6, 1.6, '#d9b36a', INK, 0.8); }
    });
    cyl(g, 5.42, 0.42, 46, 0.085, 21, '#f4b8c9'); cyl(g, 5.42, 0.42, 67, 0.04, 5, '#17171b');
    cyl(g, 5.68, 0.36, 46, 0.075, 17, C.neon); cyl(g, 5.68, 0.36, 63, 0.035, 4, '#17171b');
    [0, 1, 2].forEach((k) => box(g, 6.0, 0.24, 46 + k * 5, 0.4, 0.34, 5, [C.cream, '#f2f0eb', C.lilac][k]!));
    cyl(g, 6.68, 0.42, 46, 0.09, 11, '#d8d4ca');
    const [px, py] = P(6.68, 0.42, 57);
    [[-0.6, 20], [0.1, 26], [0.75, 19]].forEach(([a, len]) => leaf(g, px, py, len!, 5.5, a!, '#57b878'));
  });
  // luz de la ventana sobre el suelo
  { const [x, y] = P(6.2, 2.4, 0); lights.push({ x, y, rx: 120, ry: 66, color: env.sky === 'noche' ? '#8fa2ff' : env.sky === 'tarde' ? '#ffb07a' : '#fff4d6', on: env.sky === 'noche' ? 0.03 : 0.1, off: env.sky === 'noche' ? 0.12 : 0.2 }); }

  /* --- máquina de jabón --- */
  floor({ id: 'vending', label: 'MÁQUINA DE JABÓN · CONSEJO DEL DÍA', tag: 'JABÓN', quiet: true, box: [7.1, 0.08, 7.9, 0.8], blocks: [[7, 0]], use: [7, 1], act: 'vending' }, 160, (g) => {
    box(g, 7.1, 0.08, 0, 0.8, 0.72, 152, C.lilac, { left: '#7a64c4', right: '#5a47a0', top: '#9a85e0' });
    onY(g, 7.1, 0.8, 152, () => {
      const w = 0.8 * TW;
      g.save(); glow(g, '#fff3c4', 6); rrect(g, 3, 4, w - 6, 14, 2); g.fillStyle = '#fff6da'; g.fill(); g.restore();
      g.strokeStyle = INK; g.lineWidth = 1.2; rrect(g, 3, 4, w - 6, 14, 2); g.stroke();
      label(g, 'JABÓN', w / 2, 11.5, INK, 700, 8, w - 10, FONT_PX);
      g.fillStyle = '#12121a'; g.fillRect(3, 22, w - 15, 88); g.strokeRect(3, 22, w - 15, 88);
      const cols2 = ['#f4b8c9', C.neon, C.cream, '#ffd36b', '#8ff0a4'];
      for (let row = 0; row < 5; row++) {
        for (let k = 0; k < 3; k++) { rrect(g, 5 + k * 7.4, 26 + row * 17, 5.6, 9, 1.4); g.fillStyle = cols2[(row + k) % 5]!; g.fill(); }
        g.fillStyle = '#3a3a48'; g.fillRect(3, 37 + row * 17, w - 15, 1.6);
      }
      g.fillStyle = lgrad(g, 3, 22, w - 12, 110, [[0, 'rgba(255,255,255,.3)'], [0.3, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.05)']]); g.fillRect(3, 22, w - 15, 88);
      g.fillStyle = '#2a2140'; g.fillRect(w - 10, 22, 7, 88); g.strokeRect(w - 10, 22, 7, 88);
      g.fillStyle = '#8ff0a4'; g.fillRect(w - 9, 26, 5, 6);
      for (let k = 0; k < 6; k++) ellipse(g, w - 8 + (k % 2) * 3, 40 + Math.floor(k / 2) * 4, 0.9, 0.9, '#d8d4ca');
      g.fillStyle = '#0c0c10'; g.fillRect(w - 8, 60, 3, 9);
      rrect(g, 5, 118, w - 10, 18, 2); g.fillStyle = '#17171b'; g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(7, 120, w - 14, 5);
    });
  });
  { const [x, y] = P(7.5, 1.5, 0); lights.push({ x, y, rx: 50, ry: 25, color: '#fff3c4', on: 0.06, off: 0.2 }); }

  /* --- mostrador --- */
  floor({ id: 'counter', label: 'MOSTRADOR · HABLA CON DANIEL', tag: 'DANIEL', box: [8.1, 2.1, 11.92, 2.9], blocks: [[8, 2], [9, 2], [10, 2], [11, 2]], use: [9, 3], act: 'daniel' }, 86, (g) => {
    box(g, 8.1, 2.1, 0, 3.82, 0.8, 50, '#2a2a32', { left: '#2a2a32', right: '#1c1c23', top: '#3a3a44' });
    box(g, 8.04, 2.04, 50, 3.94, 0.92, 4, C.wood, { left: C.wood, right: C.woodD, top: shade(C.wood, 0.16) });
    onY(g, 8.1, 2.9, 50, () => {
      const w = 3.82 * TW;
      g.fillStyle = C.cream; g.fillRect(0, 10, w, 3); g.fillRect(0, 40, w, 3);
      g.fillStyle = 'rgba(255,255,255,.04)'; for (let u = 12; u < w; u += 12) g.fillRect(u, 13, 1, 27);
      label(g, 'SOAPBRXND', w / 2, 27, '#fbf6ea', 700, 19, w - 40);
      ellipse(g, 14, 26.5, 5, 5, null, IRI[0], 1.5); ellipse(g, w - 14, 26.5, 5, 5, null, IRI[2], 1.5);
    });
    // caja registradora
    box(g, 10.95, 2.26, 54, 0.62, 0.5, 13, '#4a4a56'); box(g, 11.0, 2.3, 67, 0.5, 0.18, 12, '#3a3a44');
    onY(g, 11.0, 2.48, 79, () => { g.fillStyle = '#0a1a12'; g.fillRect(3, 2.5, 18, 7); label(g, 'HOLA', 12, 6.4, '#8ff0a4', 700, 5.5, 16, FONT_PX); });
    // timbre
    cyl(g, 10.5, 2.5, 54, 0.07, 2, '#3a3a42');
    { const [bx, by] = P(10.5, 2.5, 56); g.beginPath(); g.ellipse(bx, by, 7, 3.5, 0, 0, TAU); g.arc(bx, by, 7, Math.PI, 0); g.closePath(); g.fillStyle = lgrad(g, bx - 7, 0, bx + 7, 0, [[0, '#ffe9a8'], [1, '#c9993a']]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); ellipse(g, bx, by - 7.5, 1.6, 1.6, '#17171b'); }
    // pastillas apiladas
    [0, 1, 2].forEach((k) => box(g, 8.4 + (k % 2) * 0.03, 2.34, 54 + k * 6, 0.3, 0.22, 6, ['#f4b8c9', '#cfe9d9', '#f4b8c9'][k]!));
    box(g, 8.86, 2.4, 54, 0.26, 0.2, 6, C.neon);
    // folletos
    onFloor(g, 9.5, 2.32, 54.5, () => { g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 16, 22); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(0, 0, 16, 22); g.fillStyle = C.lilac; g.fillRect(2, 2, 12, 7); g.fillStyle = '#8b8678'; g.fillRect(2, 12, 12, 1.4); g.fillRect(2, 15, 9, 1.4); });
  });
  { const [x, y] = P(10, 1.3, 30); lights.push({ x, y, rx: 150, ry: 80, color: '#ffe2b0', on: 0.06, off: 0.26 }); }

  /* --- perchero con las prendas --- */
  const RY = 5.5, RZ = 118;
  floor({ id: 'rack', box: [1.86, 5.34, 4.94, 5.66], blocks: [[2, 5], [3, 5], [4, 5]] }, RZ + 12, (g) => {
    for (const rx of [1.9, 4.74]) {
      box(g, rx - 0.04, 5.2, 0, 0.24, 0.6, 4, '#22222a');
      box(g, rx + 0.04, RY - 0.05, 4, 0.08, 0.1, RZ - 4, '#3a3a44', { left: '#4a4a56', right: '#26262e', top: '#5c5c68' });
    }
    box(g, 1.9, RY - 0.03, RZ - 2, 2.96, 0.06, 4, C.metal, { left: '#b9b9c4', right: '#70707c', top: '#dcdce6' });
  });
  const hung = data.items.filter((i) => i.sprite === 'hoodie' || i.sprite === 'tee' || i.sprite === 'scarf').slice(0, 5);
  hung.forEach((p: RoomItem, i) => {
    const gx = 2.32 + (hung.length > 1 ? (i * 2.2) / (hung.length - 1) : 1.1), S = 0.5;
    const o = P(gx, RY + 0.04, RZ + 6);
    const it = add({ id: 'piece-' + p.slug, label: `${p.name} · ${p.stockLabel}`, tag: i === Math.floor(hung.length / 2) ? 'ROPA' : undefined, quiet: i !== Math.floor(hung.length / 2),
      box: [gx - 0.2, RY + 0.02, gx + 0.2, RY + 0.12], use: [Math.min(4, Math.max(2, Math.round(gx - 0.5))), 6], act: 'piece:' + p.slug, shadow: false, bias: 0.02 + i * 0.001 },
      [o[0] - 30, o[1] - 8, o[0] + 30, o[1] + 66], (g) => {
        g.save(); g.transform(S, S * 0.5, 0, S, o[0] - 50 * S, o[1] - 25 * S - 4);
        drawPiece(g, p, { shadow: true });
        g.restore();
      });
    void it;
  });

  /* --- maniquí con el look destacado --- */
  const lookTop = data.items.find((i) => i.purchasable && i.wear?.slot === 'top') ?? data.items.find((i) => i.wear?.slot === 'top');
  const lookHead = data.items.find((i) => i.wear?.slot === 'head');
  if (lookTop) {
    floor({ id: 'mannequin', label: `MANIQUÍ · ${lookTop.name}`, tag: 'LOOK', quiet: true, box: [7.16, 3.16, 7.84, 3.84], blocks: [[7, 3]], use: [7, 4], act: 'look' }, 140, (g) => {
      cyl(g, 7.5, 3.5, 0, 0.24, 7, '#22222a', '#3a3a44');
      const [cx, cy] = P(7.5, 3.5, 7);
      g.fillStyle = lgrad(g, cx - 2, 0, cx + 2, 0, [[0, '#d0d0da'], [1, '#70707c']]); g.fillRect(cx - 2, cy - 52, 4, 52); g.strokeStyle = INK; g.lineWidth = 1; g.strokeRect(cx - 2, cy - 52, 4, 52);
      // busto de lino
      g.beginPath(); g.moveTo(cx - 17, cy - 96); g.quadraticCurveTo(cx - 21, cy - 70, cx - 15, cy - 50); g.lineTo(cx + 15, cy - 50); g.quadraticCurveTo(cx + 21, cy - 70, cx + 17, cy - 96); g.closePath();
      g.fillStyle = lgrad(g, cx - 20, 0, cx + 20, 0, [[0, '#f2ead8'], [1, '#c9bda4']]); g.fill(); g.stroke();
      g.save(); g.translate(cx - 31, cy - 116); g.scale(0.62, 0.62); drawPiece(g, lookTop, { hanger: false, shadow: true }); g.restore();
      // cabeza
      ellipse(g, cx, cy - 113, 10.5, 11.5, lgrad(g, cx - 10, 0, cx + 10, 0, [[0, '#f2ead8'], [1, '#c9bda4']]), INK, 1.5);
      if (lookHead) { g.save(); g.translate(cx - 16, cy - 137); g.scale(0.32, 0.32); drawPiece(g, lookHead, { shadow: false }); g.restore(); }
    });
    { const [x, y] = P(7.5, 3.6, 0); lights.push({ x, y, rx: 60, ry: 30, color: '#fff4d6', on: 0.08, off: 0.2 }); }
  }

  /* --- caballete y cajón de láminas --- */
  const prints = data.items.filter((i) => i.sprite === 'print');
  if (prints.length) {
    floor({ id: 'prints', label: 'LÁMINAS · VER LAS QUE HAY', tag: 'LÁMINAS', quiet: true, box: [1.12, 4.12, 1.9, 4.9], blocks: [[1, 4]], use: [2, 4], act: 'cat:print' }, 112, (g) => {
      // caballete
      seg(g, P(1.2, 4.42, 0), P(1.46, 4.3, 104), '#8f6d48', 3.4); seg(g, P(1.78, 4.42, 0), P(1.5, 4.3, 104), '#8f6d48', 3.4); seg(g, P(1.5, 4.16, 0), P(1.48, 4.3, 100), '#6f5334', 3);
      seg(g, P(1.2, 4.42, 0), P(1.46, 4.3, 104), INK, 0.8); seg(g, P(1.78, 4.42, 0), P(1.5, 4.3, 104), INK, 0.8);
      box(g, 1.18, 4.4, 34, 0.64, 0.06, 3, C.wood);
      g.save(); const o = P(1.22, 4.46, 98); g.transform(0.6, 0.3, 0, 0.6, o[0], o[1] - 8); drawPiece(g, prints[0]!, { shadow: true }); g.restore();
      // cajón con más láminas
      box(g, 1.22, 4.56, 0, 0.6, 0.32, 20, C.woodD, { left: C.wood, right: C.woodD, top: '#3a2a1c' });
      prints.slice(0, 3).forEach((p, k) => {
        const o2 = P(1.26 + k * 0.03, 4.62 + k * 0.08, 46);
        g.save(); g.transform(1, 0.5, 0, 1, o2[0], o2[1]);
        g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 24, 30); g.fillStyle = patternFill(g, p.pattern, 9); g.fillRect(2.5, 2.5, 19, 25); g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(0, 0, 24, 30);
        g.restore();
      });
      litFace(g, yFace(1.22, 1.82, 4.88, 0, 20), C.wood, 0.16);
    });
  }

  /* --- mesa de telas --- */
  const cloths = data.items.filter((i) => i.sprite === 'fabric' || i.sprite === 'scarf');
  floor({ id: 'table', label: 'MESA DE CORTE · TELAS Y PAÑUELOS', tag: 'TELAS', quiet: true, box: [8.4, 5.14, 10.6, 5.94], blocks: [[8, 5], [9, 5], [10, 5]], use: [9, 6], act: 'cat:textil' }, 110, (g) => {
    for (const [a, b] of [[8.46, 5.2], [10.44, 5.2], [8.46, 5.8], [10.44, 5.8]]) box(g, a!, b!, 0, 0.1, 0.1, 36, '#22222a');
    box(g, 8.4, 5.14, 36, 2.2, 0.8, 5, C.wood, { left: C.wood, right: C.woodD, top: shade(C.wood, 0.18) });
    const fabrics = cloths.filter((c) => c.sprite === 'fabric');
    const rolls = (fabrics.length ? fabrics : data.items).slice(0, 3);
    rolls.forEach((p, k) => { // rollos de pie
      const rx = 8.66 + k * 0.34, ry = 5.34, r = 0.1, hh = 54;
      const [cx, cy] = P(rx, ry, 41), wpx = r * TW * 1.42;
      g.beginPath(); g.moveTo(cx - wpx, cy - hh); g.lineTo(cx - wpx, cy); g.ellipse(cx, cy, wpx, wpx / 2, 0, Math.PI, 0, true); g.lineTo(cx + wpx, cy - hh); g.closePath();
      g.fillStyle = patternFill(g, p.pattern, Math.max(8, repFor(p.pattern, 34))); g.fill();
      g.fillStyle = lgrad(g, cx - wpx, 0, cx + wpx, 0, [[0, 'rgba(255,255,255,.2)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.34)']]); g.fill();
      g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke();
      ellipse(g, cx, cy - hh, wpx, wpx / 2, mix(artTone(p.pattern), '#ffffff', 0.2), INK, 1.4); ellipse(g, cx, cy - hh, wpx * 0.38, wpx * 0.19, '#c9a877', INK, 1);
    });
    const drape = fabrics[0] ?? data.items[0];
    if (drape) { // un paño cayendo por delante
      const pts: Pt[] = [P(9.7, 5.5, 41.5), P(10.4, 5.5, 41.5), P(10.4, 5.94, 41.5), P(10.4, 5.94, 16), P(10.22, 5.94, 12), P(10.05, 5.94, 17), P(9.88, 5.94, 12), P(9.7, 5.94, 16), P(9.7, 5.94, 41.5)];
      poly(g, pts, patternFill(g, drape.pattern, Math.max(9, repFor(drape.pattern, 40))), INK, 1.4);
      poly(g, [P(9.7, 5.94, 41.5), P(10.4, 5.94, 41.5), P(10.4, 5.94, 16), P(10.22, 5.94, 12), P(10.05, 5.94, 17), P(9.88, 5.94, 12), P(9.7, 5.94, 16)], 'rgba(0,0,0,.2)');
    }
    const scarf = cloths.find((c) => c.sprite === 'scarf');
    if (scarf) onFloor(g, 9.76, 5.2, 41.5, () => { rrect(g, 0, 0, 22, 13, 1.5); g.fillStyle = patternFill(g, scarf.pattern, 8); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(); });
    // cinta métrica y tijeras
    seg(g, P(8.5, 5.84, 41.5), P(9.5, 5.84, 41.5), '#ffd36b', 2.6); seg(g, P(8.5, 5.84, 41.5), P(9.5, 5.84, 41.5), 'rgba(23,23,27,.5)', 0.6);
    { const [sx, sy] = P(9.56, 5.66, 42); seg(g, [sx - 8, sy - 3], [sx + 7, sy + 2], '#d0d0da', 1.8); seg(g, [sx - 8, sy + 1], [sx + 7, sy - 3], '#d0d0da', 1.8); ellipse(g, sx - 9.5, sy - 3.4, 2.6, 2, null, '#d93f44', 1.6); ellipse(g, sx - 9.5, sy + 1.6, 2.6, 2, null, '#d93f44', 1.6); }
  });
  { const [x, y] = P(9.5, 5.9, 0); lights.push({ x, y, rx: 90, ry: 44, color: '#fff4d6', on: 0.05, off: 0.16 }); }

  /* --- banco de espera --- */
  const seats: Scene['seats'] = [{ x: 11.42, y: 5.7, z: 27 }, { x: 11.42, y: 6.5, z: 27 }];
  floor({ id: 'bench', label: 'BANCO DE ESPERA · SIÉNTATE', tag: 'BANCO', quiet: true, box: [11.02, 5.1, 11.9, 7.9], blocks: [[11, 5], [11, 6], [11, 7]], use: [10, 6], act: 'sit' }, 56, (g) => {
    for (const b of [5.2, 7.68]) { box(g, 11.1, b, 0, 0.1, 0.1, 22, '#22222a'); box(g, 11.72, b, 0, 0.1, 0.1, 22, '#22222a'); }
    box(g, 11.02, 5.1, 22, 0.88, 2.8, 5, C.wood, { left: C.wood, right: C.woodD, top: shade(C.wood, 0.16) });
    for (let k = 1; k < 4; k++) seg(g, P(11.02 + k * 0.22, 5.1, 27), P(11.02 + k * 0.22, 7.9, 27), 'rgba(23,23,27,.3)', 1);
    // cesta de la colada
    box(g, 11.16, 7.14, 27, 0.6, 0.6, 17, '#f2f0eb', { left: '#e2ddd0', right: '#c4bdac', top: '#3a3328' });
    for (let k = 1; k < 5; k++) seg(g, P(11.16 + k * 0.12, 7.74, 28), P(11.16 + k * 0.12, 7.74, 43), 'rgba(23,23,27,.25)', 1);
    const [bx, by] = P(11.46, 7.44, 46);
    data.items.slice(1, 4).forEach((m, k) => { rrect(g, bx - 14 + k * 8, by - 5 - (k % 2) * 4, 13, 9, 4); g.fillStyle = patternFill(g, m.pattern, 7); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(); });
  });

  /* --- cartel de suelo mojado --- */
  floor({ id: 'wet', label: 'SUELO RECIÉN FREGADO', box: [6.3, 8.24, 6.7, 8.64], blocks: [[6, 8]], use: [5, 8], act: 'wet', quiet: true, tag: 'OJO' }, 50, (g) => {
    poly(g, [P(6.5, 8.36, 44), P(6.3, 8.36, 0), P(6.7, 8.36, 0)], '#d9a83a', INK);
    poly(g, [P(6.5, 8.5, 44), P(6.28, 8.62, 0), P(6.72, 8.62, 0)], '#ffd36b', INK);
    const [cx, cy] = P(6.5, 8.6, 21);
    poly(g, [[cx, cy - 10], [cx + 8, cy + 5], [cx - 8, cy + 5]], '#17171b');
    label(g, '!', cx, cy + 0.5, '#ffd36b', 700, 10, 8);
  });

  /* --- planta del frente --- */
  floor({ id: 'plant2', box: [11.22, 9.2, 11.8, 9.78], blocks: [[11, 9]] }, 96, (g) => {
    cyl(g, 11.5, 9.5, 0, 0.17, 24, C.cream);
    const [cx, cy] = P(11.5, 9.5, 24);
    ellipse(g, cx, cy, 9, 4.4, '#2a2018');
    [[-0.5, 50], [0.42, 58], [-0.14, 68], [0.8, 40], [-0.9, 38]].forEach(([a, len], i) => leaf(g, cx + a! * 3, cy - 1, len!, 5.2, a! * 0.5, ['#2f7d4d', '#3f9a62', '#57b878'][i % 3]!));
  });

  /* --- calcetines perdidos --- */
  SOCK_SPOTS.forEach((s, i) => {
    if (env.socks.includes(i)) return;
    const [sx, sy] = P(s.at[0], s.at[1], s.at[2]);
    add({ id: 'sock' + i, label: 'UN CALCETÍN PERDIDO', tag: null, box: [s.at[0] - 0.1, s.at[1] - 0.1, s.at[0] + 0.1, s.at[1] + 0.1], use: s.near, act: 'sock:' + i, shadow: false, bias: 0.05 },
      [sx - 12, sy - 20, sx + 14, sy + 6], (g) => {
        g.save(); g.translate(sx, sy); g.rotate(i % 2 ? 0.5 : -0.4);
        g.beginPath(); g.moveTo(-4, -15); g.lineTo(4, -15); g.lineTo(4, -4); g.quadraticCurveTo(11, -3, 10, 2); g.quadraticCurveTo(3, 5, -4, 1); g.closePath();
        g.fillStyle = '#fbfaf6'; g.fill(); g.save(); g.clip(); g.fillStyle = s.col; g.fillRect(-6, -12, 12, 3); g.fillRect(-6, -7, 12, 3); g.fillRect(4, -1, 8, 6); g.restore();
        g.strokeStyle = INK; g.lineWidth = 1.4; g.lineJoin = 'round'; g.stroke();
        g.restore();
      });
  });

  return { items, lights, seats };
}

/* ================= escena completa ================= */
export function buildScene(data: RoomData, env: Env): Scene {
  const { items, lights, seats } = build(env, data);
  const x0 = P(0, ROWS)[0] - 24, x1 = P(COLS, 0)[0] + 24, y0 = -WALL - 24, y1 = (COLS + ROWS) * TH + 30;
  const bg = sprite(x0, y0, x1, y1, env.res, (g) => {
    drawWalls(g, env, data);
    drawFloor(g);
    drawRugs(g);
    // sombras de contacto: la luz viene del fondo izquierdo
    g.save(); poly(g, zFace(0, 0, COLS, ROWS, 0)); g.clip();
    items.filter((i) => !i.wall && i.shadow !== false).forEach((i) => {
      const [a, b, c, d] = i.box;
      poly(g, [P(a, b), P(c + 0.42, b + 0.14), P(c + 0.42, d + 0.42), P(a + 0.14, d + 0.42)], 'rgba(0,0,0,.13)');
      poly(g, [P(a, b), P(c + 0.2, b + 0.04), P(c + 0.2, d + 0.2), P(a + 0.04, d + 0.2)], 'rgba(0,0,0,.2)');
    });
    g.restore();
  });
  // rótulo y focos generales
  { const [x, y] = P(3, 0, 196); lights.push({ x, y, rx: 190, ry: 80, color: '#ffeccd', on: 0.05, off: 0.2 }); }
  ([[3.2, 3.4], [7.4, 4.2], [4.6, 7.4], [9.4, 7.6]] as const).forEach(([lx, ly]) => { const [x, y] = P(lx, ly); lights.push({ x, y, rx: 170, ry: 85, color: '#fff0cf', on: 0, off: 0.13 }); });

  const blocked = new Set<string>();
  items.forEach((it) => it.blocks.forEach(([x, y]) => blocked.add(x + ',' + y)));
  for (let x = 8; x < COLS; x++) for (let y = 0; y < 2; y++) blocked.add(x + ',' + y); // detrás del mostrador
  const clip: Pt[] = [P(-0.24, ROWS, WALL + 2), P(-0.24, -0.24, WALL + 2), P(COLS, -0.24, WALL + 2), P(COLS, 0, -16), P(COLS, ROWS, -16), P(0, ROWS, -16)];
  items.forEach(maskOf);
  return { bg, items, lights, clip, blocked, seats, daniel: [9.9, 1.32], spawn: [0.5, 8.5] };
}

/** Máscara de píxeles opacos del sprite, a media resolución, para saber qué se toca. */
function maskOf(it: Item) {
  if (!it.act) return;
  const k = 0.5, w = Math.max(1, Math.ceil(it.spr.w * k)), h = Math.max(1, Math.ceil(it.spr.h * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(it.spr.c, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3]! > 40 ? 1 : 0;
  it.mask = { w, h, k, a };
}
/** ¿El punto de mundo (wx, wy) cae sobre el mueble? `r` da margen para dedos y piezas finas. */
export function hits(it: Item, wx: number, wy: number, r = 0): boolean {
  const m = it.mask; if (!m) return false;
  const px = Math.floor((wx - it.spr.x) * m.k), py = Math.floor((wy - it.spr.y) * m.k), rr = Math.ceil(r * m.k);
  for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
    const x = px + dx, y = py + dy;
    if (x >= 0 && y >= 0 && x < m.w && y < m.h && m.a[y * m.w + x]) return true;
  }
  return false;
}
