/*
 * Mockups de pixel de cada soporte (48×48), dibujados por código.
 * Códigos de celda:
 *   p arte · q arte en sombra · h arte con brillo · k ribete (arte muy oscuro)
 *   w detalle crema · a papel · f marco · n cartón · m metal (percha) · o contorno · . vacío
 * El componente ProductArt rellena p/q/h/k con el patrón del arte.
 */
import type { RoomSprite } from './room';

export const MOCKUP_SIZE = 48;
type Pt = [number, number];

class Grid {
  readonly c: string[][] = Array.from({ length: MOCKUP_SIZE }, () => Array<string>(MOCKUP_SIZE).fill('.'));

  set(x: number, y: number, k: string) {
    if (x >= 0 && y >= 0 && x < MOCKUP_SIZE && y < MOCKUP_SIZE) this.c[y]![x] = k;
  }
  get(x: number, y: number): string { return this.c[y]?.[x] ?? '.'; }
  rect(x: number, y: number, w: number, h: number, k: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, k);
  }
  /** Polígono relleno, muestreado en el centro de cada celda. */
  poly(pts: Pt[], k: string) {
    for (let y = 0; y < MOCKUP_SIZE; y++) {
      const sy = y + 0.5, xs: number[] = [];
      pts.forEach(([x1, y1], i) => {
        const [x2, y2] = pts[(i + 1) % pts.length]!;
        if ((y1 <= sy && y2 > sy) || (y2 <= sy && y1 > sy)) xs.push(x1 + ((sy - y1) * (x2 - x1)) / (y2 - y1));
      });
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]!); x < Math.round(xs[i + 1]!); x++) this.set(x, y, k);
    }
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, k: string) {
    for (let y = 0; y < MOCKUP_SIZE; y++) for (let x = 0; x < MOCKUP_SIZE; x++) {
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y, k);
    }
  }
  /** Cambia el código de las celdas ya pintadas con `from` que cumplan la condición. */
  tint(from: string, to: string, where: (x: number, y: number) => boolean) {
    for (let y = 0; y < MOCKUP_SIZE; y++) for (let x = 0; x < MOCKUP_SIZE; x++) if (this.c[y]![x] === from && where(x, y)) this.c[y]![x] = to;
  }
  /** Contorno de tinta en toda celda vacía que toque algo pintado (no la percha). */
  outline() {
    const add: Pt[] = [];
    for (let y = 0; y < MOCKUP_SIZE; y++) for (let x = 0; x < MOCKUP_SIZE; x++) {
      if (this.c[y]![x] !== '.') continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = this.get(x + dx!, y + dy!); return n !== '.' && n !== 'm' && n !== 'o'; })) add.push([x, y]);
    }
    add.forEach(([x, y]) => this.set(x, y, 'o'));
  }
  rows(): string[] { return this.c.map((r) => r.join('')); }
}

function hanger(g: Grid) {
  g.rect(24, 3, 1, 5, 'm');
  g.set(25, 2, 'm'); g.set(26, 2, 'm'); g.set(27, 3, 'm'); g.set(27, 4, 'm');
}
const mirror = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [MOCKUP_SIZE - x, y]);

function tee(g: Grid) {
  hanger(g);
  const sleeve: Pt[] = [[14, 9], [5, 15], [9, 22], [14, 19]];
  g.poly(sleeve, 'p'); g.poly(mirror(sleeve), 'p');
  g.rect(14, 9, 20, 33, 'p');
  // cuello acanalado y hueco
  g.ellipse(24, 9.5, 6, 3.6, 'k');
  g.ellipse(24, 8.6, 4, 2.4, '.');
  g.rect(24, 3, 1, 5, 'm');
  // volumen
  g.tint('p', 'q', (x, y) => x >= 30 && y > 12);
  g.tint('p', 'q', (x, y) => x >= 34 && x - 34 > (y - 9) * 0.2);
  g.tint('p', 'q', (x, y) => (x === 14 || x === 13) && y >= 19);
  g.tint('p', 'h', (x, y) => (x === 16 || x === 17) && y >= 13 && y <= 30);
  g.tint('p', 'k', (_x, y) => y === 40);
  g.tint('q', 'k', (_x, y) => y === 40);
  g.tint('p', 'k', (x, y) => x <= 9 && y >= 14 && Math.abs((y - 15) - (x - 5) * 1.75) < 1.2);
  g.tint('q', 'k', (x, y) => x >= 39 && y >= 14 && Math.abs((y - 15) - (43 - x) * 1.75) < 1.2);
}

function hoodie(g: Grid) {
  hanger(g);
  const sleeve: Pt[] = [[13, 12], [6, 16], [3, 37], [9, 37], [13, 25]];
  g.poly(sleeve, 'p'); g.poly(mirror(sleeve), 'p');
  g.rect(13, 12, 22, 30, 'p');
  // capucha por detrás del cuello
  g.ellipse(24, 10.5, 9, 6, 'p');
  g.ellipse(24, 11.5, 5.5, 3.8, 'q');
  g.ellipse(24, 10.6, 3.6, 2.3, '.');
  g.rect(24, 3, 1, 6, 'm');
  // puños y cinturilla acanalados
  g.rect(3, 35, 6, 3, 'k'); g.rect(39, 35, 6, 3, 'k');
  g.rect(13, 39, 22, 3, 'k');
  // bolsillo canguro
  for (let x = 17; x <= 30; x++) g.set(x, 29, 'q');
  for (let i = 0; i < 8; i++) { g.set(17 - Math.floor(i / 3), 30 + i, 'q'); g.set(30 + Math.floor(i / 3), 30 + i, 'q'); }
  // cordones
  g.rect(21, 15, 1, 8, 'w'); g.rect(26, 15, 1, 6, 'w');
  // volumen
  g.tint('p', 'q', (x, y) => x >= 31 && x <= 34 && y > 14 && y < 39);
  g.tint('p', 'q', (x) => x >= 41);
  g.tint('p', 'q', (x, y) => x === 13 && y >= 25);
  g.tint('p', 'h', (x, y) => (x === 15 || x === 16) && y >= 16 && y <= 27);
  g.tint('p', 'h', (x, y) => x === 6 && y >= 20 && y <= 30);
}

function beanie(g: Grid) {
  g.ellipse(24, 23, 14, 14, 'p');
  g.rect(0, 30, MOCKUP_SIZE, 18, '.');
  g.rect(10, 23, 28, 9, 'p');
  // vuelta acanalada
  g.rect(9, 31, 30, 9, 'k');
  for (let x = 11; x < 38; x += 3) g.rect(x, 32, 1, 7, 'q');
  // pompón
  g.ellipse(24, 7.5, 4.5, 4.5, 'w');
  // etiqueta tejida
  g.rect(14, 34, 5, 3, 'w');
  // volumen
  g.tint('p', 'q', (x, y) => x >= 31 && y > 12);
  g.tint('p', 'h', (x, y) => x >= 14 && x <= 16 && y >= 15 && y <= 26);
  for (let x = 16; x <= 32; x += 4) g.tint('p', 'q', (cx, cy) => cx === x && cy > 14 && cy < 30);
}

function print(g: Grid) {
  // clavo y alambre
  g.set(24, 2, 'm');
  for (let i = 0; i < 6; i++) { g.set(23 - i, 3 + Math.floor(i / 2), 'm'); g.set(25 + i, 3 + Math.floor(i / 2), 'm'); }
  g.rect(9, 7, 30, 38, 'f');
  g.rect(11, 9, 26, 34, 'a');
  g.rect(14, 12, 20, 28, 'p');
  g.tint('p', 'q', (x) => x >= 32);
  g.tint('p', 'q', (_x, y) => y >= 38);
  g.tint('p', 'h', (x, y) => x === 15 && y >= 13 && y <= 22);
}

function fabric(g: Grid) {
  // tela desenrollada con caída
  g.poly([[15, 9], [42, 12], [43, 41], [15, 43]], 'p');
  for (const x of [23, 31, 38]) g.tint('p', 'q', (cx, cy) => (cx === x || cx === x + 1) && cy > 11 + (x - 15) / 6);
  for (const x of [20, 28, 35]) g.tint('p', 'h', (cx, cy) => cx === x && cy > 12 && cy < 38);
  // bajo ondulado
  for (let x = 18; x < 43; x += 6) { g.set(x, 42, '.'); g.set(x + 1, 42, '.'); g.set(x + 1, 41, '.'); }
  // rollo
  g.rect(6, 6, 10, 38, 'p');
  g.tint('p', 'q', (x, y) => x >= 13 && x <= 15 && y >= 6);
  g.tint('p', 'h', (x) => x === 7);
  g.ellipse(11, 6, 5, 2.2, 'n');
  g.ellipse(11, 6, 2, 0.9, 'f');
  g.ellipse(11, 44, 5, 2.2, 'q');
}

function scarf(g: Grid) {
  hanger(g);
  g.rect(8, 8, 32, 2, 'm');
  g.poly([[9, 10], [39, 10], [24, 43]], 'k');
  g.poly([[12, 12], [36, 12], [24, 39]], 'p');
  g.tint('p', 'q', (x, y) => x >= 27 && y > 12);
  g.tint('p', 'q', (x, y) => Math.abs(x - 24) < 1 && y > 14);
  g.tint('p', 'h', (x, y) => x === 16 + Math.floor((y - 12) / 2.4) && y < 26);
}

const DRAW: Record<RoomSprite, (g: Grid) => void> = { hoodie, tee, beanie, print, fabric, scarf };
const cache = new Map<RoomSprite, string[]>();

export function mockup(sprite: RoomSprite): string[] {
  let rows = cache.get(sprite);
  if (!rows) {
    const g = new Grid();
    DRAW[sprite](g);
    g.outline();
    rows = g.rows();
    cache.set(sprite, rows);
  }
  return rows;
}

/** Trazado SVG de todas las celdas con alguno de los códigos, uniendo tramos horizontales. */
export function cellPaths(rows: readonly string[], codes: string): string {
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!codes.includes(row[x]!)) continue;
      let end = x;
      while (end + 1 < row.length && codes.includes(row[end + 1]!)) end++;
      const len = end - x + 1;
      d += `M${x} ${y}h${len}v1h-${len}z`;
      x = end;
    }
  });
  return d;
}
