/* Reglas puras de la sala (sin DOM): caminos, teclas, Daniel, bolsa y hora del día. */
import type { RoomData, RoomItem, RoomWasher } from '@/modules/catalog/room';

export type Tile = [number, number];
export type Free = (x: number, y: number) => boolean;

/** Camino más corto entre baldosas (8 direcciones, sin cortar esquinas). Devuelve centros de baldosa. */
export function findPath(sx: number, sy: number, tx: number, ty: number, free: Free): [number, number][] | null {
  if (!free(tx, ty)) return null;
  const key = (x: number, y: number) => x + ',' + y;
  const prev = new Map<string, Tile | null>([[key(sx, sy), null]]);
  const dist = new Map<string, number>([[key(sx, sy), 0]]);
  const open: Tile[] = [[sx, sy]];
  while (open.length) {
    let best = 0;
    for (let i = 1; i < open.length; i++) if (dist.get(key(...open[i]!))! < dist.get(key(...open[best]!))!) best = i;
    const [x, y] = open.splice(best, 1)[0]!;
    if (x === tx && y === ty) break;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!free(nx, ny)) continue;
      if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue;
      const nd = dist.get(key(x, y))! + (dx && dy ? 1.41 : 1);
      const old = dist.get(key(nx, ny));
      if (old === undefined || nd < old) { dist.set(key(nx, ny), nd); prev.set(key(nx, ny), [x, y]); open.push([nx, ny]); }
    }
  }
  if (!prev.has(key(tx, ty))) return null;
  const out: [number, number][] = [];
  let cur: Tile | null | undefined = [tx, ty];
  while (cur && !(cur[0] === sx && cur[1] === sy)) { out.unshift([cur[0] + 0.5, cur[1] + 0.5]); cur = prev.get(key(...cur)); }
  return out;
}

/** La baldosa libre más cercana a una dada (para acercarse a algo que no se pisa). */
export function nearestFree(tx: number, ty: number, free: Free, reach = 3): Tile | null {
  let best: Tile | null = null, bd = Infinity;
  for (let dx = -reach; dx <= reach; dx++) for (let dy = -reach; dy <= reach; dy++) {
    const x = tx + dx, y = ty + dy, d = Math.hypot(dx, dy);
    if (free(x, y) && d < bd) { bd = d; best = [x, y]; }
  }
  return best;
}

/** Flechas y WASD en direcciones de pantalla: arriba es «hacia el fondo» de la sala. */
const KEY_DIRS: Record<string, Tile> = {
  arrowup: [-1, -1], w: [-1, -1], arrowdown: [1, 1], s: [1, 1],
  arrowleft: [-1, 1], a: [-1, 1], arrowright: [1, -1], d: [1, -1],
};
export const isMoveKey = (key: string) => key.toLowerCase() in KEY_DIRS;
/** Siguiente baldosa al pulsar las teclas dadas; si la diagonal está tapada prueba a deslizarse por un lado. */
export function keyStep(keys: Iterable<string>, x: number, y: number, free: Free): Tile | null {
  let dx = 0, dy = 0;
  for (const k of keys) { const d = KEY_DIRS[k.toLowerCase()]; if (d) { dx += d[0]; dy += d[1]; } }
  dx = Math.sign(dx); dy = Math.sign(dy);
  if (!dx && !dy) return null;
  const ok = (ax: number, ay: number) => free(x + ax, y + ay) && (!(ax && ay) || (free(x + ax, y) && free(x, y + ay)));
  if (ok(dx, dy)) return [x + dx, y + dy];
  if (dx && dy) {
    if (ok(dx, 0)) return [x + dx, y];
    if (ok(0, dy)) return [x, y + dy];
  }
  return null;
}

/* ---------------- bolsa ---------------- */
/** Unidades en la cookie de la bolsa («id:cantidad.id:cantidad»). */
export function bagCount(cookie: string): number {
  const m = cookie.match(/(?:^|; )sbx_bolsa=([^;]*)/);
  if (!m) return 0;
  let raw = m[1]!;
  try { raw = decodeURIComponent(raw); } catch { /* se queda como está */ }
  return raw.split('.').reduce((s, p) => { const q = Number(p.split(':')[1]); return s + (Number.isInteger(q) && q > 0 ? Math.min(q, 10) : 0); }, 0);
}

export const euro = (c: number) => (c / 100).toLocaleString('es-ES', { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';

/* ---------------- hora del día ---------------- */
export type Daylight = 'dia' | 'tarde' | 'noche';
export function daylight(hour: number): Daylight {
  if (hour >= 8 && hour < 18) return 'dia';
  if (hour >= 18 && hour < 21) return 'tarde';
  return 'noche';
}

/* ---------------- drops ---------------- */
export type WasherStatus = 'available' | 'coming' | 'locked' | 'soldout';
export const PHASE_STATUS: Record<string, WasherStatus> = { abierto: 'available', anunciado: 'coming', llave: 'locked', agotado: 'soldout', archivo: 'soldout' };
export const PHASE_LABEL: Record<string, string> = { abierto: 'GIRANDO', anunciado: 'PRONTO', llave: 'CON LLAVE', agotado: 'AGOTADO', archivo: 'ARCHIVO' };
export const washerStatus = (w: Pick<RoomWasher, 'phase'>): WasherStatus => PHASE_STATUS[w.phase] ?? 'locked';
export function opensLabel(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'pronto';
}

/* ---------------- Daniel (respuestas fijas hasta conectar la IA) ---------------- */
export type DanielReply = { text: string; show?: string };
const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Talla orientativa por altura para el corte boxy de la marca. */
export function sizeForHeight(cm: number): string {
  if (cm < 165) return 'S';
  if (cm < 178) return 'M';
  if (cm < 188) return 'L';
  return 'XL';
}
function heightIn(t: string): number | null {
  const m = t.match(/\b(1[.,]\d{2})\s*m?\b/) ?? t.match(/\b(1\d{2}|2[01]\d)\s*(?:cm)?\b/);
  if (!m) return null;
  const n = Number(m[1]!.replace(',', '.'));
  const cm = n < 3 ? Math.round(n * 100) : n;
  return cm >= 130 && cm <= 215 ? cm : null;
}
/** La pieza de la que habla el cliente, si nombra alguna (por soporte o por arte). */
export function itemIn(t: string, items: readonly RoomItem[]): RoomItem | null {
  const words = new Set(t.split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2));
  let best: RoomItem | null = null, score = 0;
  for (const i of items) {
    const hay = plain(`${i.name} ${i.support} ${i.artName}`).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2);
    const n = hay.filter((w) => words.has(w) || words.has(w + 's') || (w === 'tee' && words.has('camiseta')) || (w === 'hoodie' && words.has('sudadera'))).length;
    if (n > score) { score = n; best = i; }
  }
  return best;
}
const stockLine = (i: RoomItem) => {
  if (!i.purchasable && i.stockLabel !== 'AGOTADO') return `${i.name} todavía no está a la venta.`;
  if (i.stockLabel === 'AGOTADO') return `${i.name} está agotada. Agotado es agotado.`;
  const sizes = i.variants.filter((v) => v.available > 0).map((v) => v.label);
  return `${i.name}: ${euro(i.priceCents)}. ${i.stockLabel === 'EN STOCK' ? 'Hay stock' : i.stockLabel.toLowerCase().replace(/^./, (c) => c.toUpperCase())}${sizes.length > 1 ? ' en ' + sizes.join(', ') : ''}.`;
};

export function danielReply(q: string, data: Pick<RoomData, 'washers' | 'items'>, pick: (n: number) => number = (n) => Math.floor(Math.random() * n)): DanielReply {
  const t = plain(q);
  const named = itemIn(t, data.items);
  const cm = heightIn(t);
  if (cm !== null) return { text: `Con ${cm} cm yo cogería la ${sizeForHeight(cm)}. El corte es boxy: si dudas entre dos, la pequeña.` };
  if (/talla|size|mido|altura|medida/.test(t)) return { text: 'El corte es boxy: si dudas entre dos tallas, coge la pequeña. Dime cuánto mides (por ejemplo «mido 175») y te digo una.' };
  if (/envi|shipping|llega|tarda|entrega/.test(t)) return { text: 'Península en 48–72 h (4,90 €, gratis desde 100 €). Baleares, 7,90 €.' };
  if (/devol|cambio|return|desist/.test(t)) return { text: 'Tienes 14 días para devolver. La tela cortada a medida no se devuelve.' };
  if (/recomi|aconsej|que me llevo|que me pongo|suger|regalo|favorit/.test(t)) {
    const buy = data.items.filter((i) => i.purchasable);
    if (!buy.length) return { text: 'Ahora mismo no hay nada girando. Vuelve cuando se abra la próxima lavadora.' };
    const i = buy[pick(buy.length)]!;
    return { text: `Hoy me llevaría ${i.name} (${euro(i.priceCents)}). Te la enseño.`, show: i.slug };
  }
  if (named && /stock|queda|agotad|hay|tienes|precio|cuanto|cuesta|vale|ensen|ver|quiero|busco/.test(t)) return { text: stockLine(named), show: named.slug };
  if (/stock|queda|agotad/.test(t)) {
    const low = data.items.filter((i) => /SOLO QUEDAN/.test(i.stockLabel)).map((i) => `${i.name} (${i.stockLabel.toLowerCase()})`);
    return { text: low.length ? 'Quedan pocas: ' + low.join(', ') + '. Agotado es agotado.' : 'Ahora mismo hay stock de casi todo.' };
  }
  if (/precio|cuanto|cuesta|vale\b|€|euro/.test(t)) {
    const buy = data.items.filter((i) => i.purchasable).slice(0, 5);
    return { text: buy.length ? buy.map((i) => `${i.name} ${euro(i.priceCents)}`).join(' · ') + '.' : 'Todavía no hay precios: nada está a la venta ahora mismo.' };
  }
  if (/llave|key|codigo|code|candado/.test(t)) return { text: 'Las llaves se reparten antes de cada drop. La lavadora con candado solo abre con una.' };
  if (/calcetin|sock/.test(t)) return { text: 'Las lavadoras se comen los calcetines. Dicen que hay cinco perdidos por la sala.' };
  if (/arte|patron|textura|textil|tela|lamina|cuadro/.test(t)) return { text: 'Cada pieza sale de un arte: patrones, texturas o textiles. Están colgados en la pared de ARTES, a la izquierda.' };
  if (/drop|lavadora|cuando|nuevo|next|proxim/.test(t)) {
    if (!data.washers.length) return { text: 'Todavía no hay lavadoras en marcha.' };
    return { text: data.washers.map((d) => {
      const s = washerStatus(d);
      return s === 'available' ? `La ${d.number} está girando (${d.name}).` : s === 'coming' ? `La ${d.number} se abre el ${opensLabel(d.opensAt)}.` : s === 'locked' ? `La ${d.number}, solo con llave.` : `La ${d.number} está agotada.`;
    }).join(' ') };
  }
  if (named) return { text: stockLine(named), show: named.slug };
  if (/luz|luces|noche|oscur/.test(t)) return { text: 'El interruptor está junto a la puerta. De noche el neón luce más.' };
  if (/hola|buenas|hey|\bey\b|que tal|\bhi\b/.test(t)) return { text: '¡Buenas! Soy Daniel, el de la lavandería. ¿Tallas, drops o envíos?' };
  if (/gracias|thanks|genial|perfecto/.test(t)) return { text: 'A mandar. Aquí estoy, 24 horas, sin secarme.' };
  if (/pompa|quien eres|eres/.test(t)) return { text: 'Yo soy una pastilla de jabón con contrato fijo. Tú eres Pompa: no explotes.' };
  return { text: 'Aún soy un Daniel de prueba: sé de tallas, drops, artes, envíos y precios. Prueba con «recomiéndame algo».' };
}
