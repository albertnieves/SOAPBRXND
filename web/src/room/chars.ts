/* Personajes: Pompa (tú), Daniel (el dependiente) y Rumbi (el robot que friega). Dibujo vectorial, origen en los pies. */
import type { PatternSpec } from '@/modules/catalog/domain';
import { patternFill } from './art';
import { ellipse, FONT_SANS, INK, lgrad, luma, mix, poly, rgba, rgrad, rrect, shade, TAU, type G, type Paint } from './core';

export const IRI = ['#9be7ff', '#c9a7ff', '#ffb3d9'] as const;

export type Skin = { name: string; base: string; dark: string; line: string; locked?: boolean };
export const SKINS: Record<string, Skin> = {
  iris: { name: 'Iris', base: '#dcedff', dark: '#a4c1ec', line: '#2b2540' },
  menta: { name: 'Menta', base: '#d2f7e4', dark: '#8fd5b2', line: '#1f3a2f' },
  rosa: { name: 'Rosa', base: '#ffdcea', dark: '#f0a5c5', line: '#4a2238' },
  sol: { name: 'Sol', base: '#fff1c4', dark: '#f2cd73', line: '#4a3a14' },
  humo: { name: 'Humo', base: '#dcdce3', dark: '#9d9daa', line: '#25252c' },
  noche: { name: 'Noche', base: '#55557c', dark: '#30304a', line: '#0b0b12' },
  oro: { name: 'Calcetín de oro', base: '#ffe08a', dark: '#e0a93a', line: '#4a3208', locked: true },
};
export const FACES: Record<string, string> = { none: 'Nada', shades: 'Gafas de sol', round: 'Gafas redondas' };
export const MOODS: Record<string, string> = { feliz: 'Feliz', tranqui: 'Tranqui', pillo: 'Guiño' };

export type Outfit = {
  skin: string;
  top: 'none' | 'tee' | 'hoodie'; topSlug: string | null; topColor: string | null; topPattern: PatternSpec | null;
  head: 'none' | 'beanie' | 'cap'; headSlug: string | null; headColor: string | null; headPattern: PatternSpec | null;
  face: string; mood: string;
};
export const DEFAULT_OUTFIT: Outfit = {
  skin: 'iris', top: 'none', topSlug: null, topColor: null, topPattern: null,
  head: 'none', headSlug: null, headColor: null, headPattern: null, face: 'none', mood: 'feliz',
};

export type Emote = 'none' | 'wave' | 'jump' | 'dance' | 'cheer' | 'sit';
export const EMOTE_TIME: Record<Emote, number> = { none: 0, wave: 1.6, jump: 0.7, dance: 3.2, cheer: 1.4, sit: Infinity };
export type Pose = {
  t: number; // reloj, en segundos
  walk: number; // fase del paso (radianes)
  moving: boolean;
  facing: 1 | -1;
  back: boolean; // de espaldas (camina hacia el fondo)
  emote: Emote;
  et: number; // segundos desde que empezó el gesto
  talk: number; // 0..1, boca al hablar
  look: [number, number]; // hacia dónde mira, -1..1
};
export const POSE: Pose = { t: 0, walk: 0, moving: false, facing: 1, back: false, emote: 'none', et: 0, talk: 0, look: [0, 0] };

const stroke = (g: G, col: Paint, lw: number) => { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };

/** Pompa de jabón: relleno nacarado, borde irisado y brillos. */
function bubble(g: G, x: number, y: number, r: number, sk: Skin, rot = 0) {
  ellipse(g, x, y, r, r, rgrad(g, x - r * 0.34, y - r * 0.4, r * 0.08, r * 1.5, [[0, '#ffffff'], [0.3, sk.base], [0.72, mix(sk.base, sk.dark, 0.7)], [1, sk.dark]]));
  g.save();
  g.beginPath(); g.arc(x, y, r - 0.4, 0, TAU); g.clip();
  const rimR = r - Math.max(1.4, r * 0.11);
  if (typeof g.createConicGradient === 'function') {
    const cg = g.createConicGradient(rot, x, y);
    [IRI[0], IRI[1], IRI[2], IRI[0], IRI[1], IRI[2], IRI[0]].forEach((c, i) => cg.addColorStop(i / 6, c));
    g.globalAlpha = 0.9; g.beginPath(); g.arc(x, y, rimR, 0, TAU); stroke(g, cg, Math.max(1.8, r * 0.15));
    g.globalAlpha = 0.28; g.beginPath(); g.arc(x, y, rimR - r * 0.14, 0, TAU); stroke(g, cg, Math.max(1.5, r * 0.16));
  } else {
    IRI.forEach((c, i) => { g.globalAlpha = 0.85; g.beginPath(); g.arc(x, y, rimR, rot + i * 2.1, rot + i * 2.1 + 1.9); stroke(g, c, Math.max(1.8, r * 0.15)); });
  }
  g.restore();
  g.beginPath(); g.arc(x, y, r, 0, TAU); stroke(g, sk.line, Math.max(1.3, r * 0.075));
  // brillos
  ellipse(g, x - r * 0.4, y - r * 0.46, r * 0.3, r * 0.17, 'rgba(255,255,255,.92)', null, 0, -0.7);
  ellipse(g, x - r * 0.63, y - r * 0.1, r * 0.07, r * 0.07, 'rgba(255,255,255,.85)');
  g.beginPath(); g.arc(x, y, r * 0.72, 0.16 * Math.PI, 0.44 * Math.PI); stroke(g, 'rgba(255,255,255,.42)', r * 0.1);
}

function cloth(g: G, pattern: PatternSpec | null, color: string | null): { fill: Paint; tone: string } {
  if (pattern) return { fill: patternFill(g, pattern, Math.max(7, Math.min(18, (pattern.scale ?? 10) * 0.9))), tone: pattern.colors[0] ?? '#e8e0d0' };
  const c = color ?? '#e8e0d0';
  return { fill: c, tone: c };
}

/**
 * Pompa: cabeza de pompa de jabón sobre un cuerpo pequeño que viste las piezas de la tienda.
 * Mide unas 92 unidades de alto; el origen es el punto del suelo entre los pies.
 */
export function drawPompa(g: G, o: Outfit, pose: Pose) {
  const sk = SKINS[o.skin] ?? SKINS.iris!;
  const { t, emote, et } = pose;
  const sit = emote === 'sit';
  const moving = pose.moving && !sit;
  const ph = pose.walk;
  const party = emote === 'dance' || emote === 'cheer' || emote === 'jump';

  let lift = 0, sx = 1, sy = 1, lean = 0;
  let bob = moving ? Math.abs(Math.cos(ph)) * 2.4 : Math.sin(t * 2.2) * 0.9;
  if (emote === 'jump') {
    const u = Math.min(1, et / EMOTE_TIME.jump);
    lift = Math.sin(u * Math.PI) * 30;
    const sq = u < 0.18 ? (0.18 - u) / 0.18 : u > 0.86 ? (u - 0.86) / 0.14 : 0;
    sx = 1 + sq * 0.14; sy = 1 - sq * 0.16;
  }
  if (emote === 'cheer') lift = Math.abs(Math.sin(et * 9)) * 7;
  if (emote === 'dance') { lean = Math.sin(et * 7.5) * 0.13; bob = Math.abs(Math.sin(et * 7.5)) * 3.4; }

  g.save();
  g.scale(pose.facing, 1);
  g.translate(0, -lift);
  g.scale(sx, sy);
  g.lineJoin = 'round'; g.lineCap = 'round';

  const top = o.top !== 'none' ? cloth(g, o.topPattern, o.topColor) : null;
  const skinFill = lgrad(g, -16, 0, 16, 0, [[0, sk.base], [0.55, mix(sk.base, sk.dark, 0.45)], [1, sk.dark]]);
  const hx = lean * 34 + (pose.back ? 0 : 1.5), hy = -66 - bob + (sit ? 2 : 0), R = 25;

  /* --- piernas y zapatillas --- */
  const leg = (side: number) => {
    const phase = ph + (side > 0 ? Math.PI : 0);
    let fx = side * 6.5 + (moving ? Math.sin(phase) * 5.5 : 0), fy = -5 - (moving ? Math.max(0, Math.cos(phase)) * 5 : 0);
    if (emote === 'dance') fy -= Math.max(0, Math.sin(et * 7.5) * side) * 4;
    g.beginPath();
    if (sit) { fx = side * 6.5 + 11; fy = -7; g.moveTo(side * 6.5, -17); g.lineTo(side * 6.5 + 10, -17); g.lineTo(fx, fy - 2); }
    else { g.moveTo(side * 6.5, -17); g.lineTo(fx, fy - 2); }
    stroke(g, sk.line, 9.4); stroke(g, mix(sk.base, sk.dark, side > 0 ? 0.75 : 0.4), 6.6);
    if (!sit) { // calcetín con raya
      const kx = side * 6.5 + (fx - side * 6.5) * 0.55, ky = -17 + (fy - 2 + 17) * 0.55;
      g.beginPath(); g.moveTo(kx, ky); g.lineTo(fx, fy - 2); stroke(g, '#f7f5f0', 6.6);
      g.beginPath(); g.moveTo(kx, ky); g.lineTo(kx + (fx - kx) * 0.3, ky + (fy - 2 - ky) * 0.3); stroke(g, IRI[side > 0 ? 2 : 0], 6.6);
    }
    // zapatilla
    const zx = fx + (pose.back ? 0.6 : 2.4), zy = fy;
    rrect(g, zx - 7.6, zy - 4.2, 15.2, 8.4, 4.2); g.fillStyle = '#f7f5f0'; g.fill(); stroke(g, INK, 1.6);
    g.beginPath(); g.moveTo(zx - 6.4, zy + 2.3); g.lineTo(zx + 6.4, zy + 2.3); stroke(g, IRI[side > 0 ? 1 : 0], 1.7);
    if (!pose.back) { g.beginPath(); g.moveTo(zx + 0.5, zy - 3.6); g.lineTo(zx + 0.5, zy - 0.4); stroke(g, 'rgba(23,23,27,.35)', 1); }
  };

  /* --- brazos --- */
  type Arm = { side: number; hx: number; hy: number; up: boolean };
  const arm = (side: number): Arm => {
    let ax = side * 18, ay = -25 + (moving ? -Math.sin(ph + (side > 0 ? Math.PI : 0)) * 3.5 : Math.sin(t * 2.2 + side) * 0.5), up = false;
    if (moving) ax += -Math.sin(ph + (side > 0 ? Math.PI : 0)) * 4.5;
    if (emote === 'wave' && side > 0) { ax = 24 + Math.sin(et * 11) * 4; ay = -66; up = true; }
    if (emote === 'cheer' || emote === 'jump') { ax = side * 23; ay = -67 - Math.sin(et * 9 + side) * 2; up = true; }
    if (emote === 'dance') { const s = Math.sin(et * 7.5) * side; ax = side * 24; ay = s > 0 ? -66 : -30; up = s > 0; }
    if (sit) { ax = side * 15 + 5; ay = -22; }
    return { side, hx: ax, hy: ay, up };
  };
  const drawArm = (a: Arm) => {
    const sxp = a.side * 13.5, syp = -41;
    const mx = (sxp + a.hx) / 2 + a.side * (a.up ? 5 : 2.5), my = (syp + a.hy) / 2 + (a.up ? 2 : 0);
    const whole = () => { g.beginPath(); g.moveTo(sxp, syp); g.quadraticCurveTo(mx, my, a.hx, a.hy); };
    whole(); stroke(g, sk.line, 9.6);
    whole(); stroke(g, mix(sk.base, sk.dark, a.side > 0 ? 0.65 : 0.3), 6.8);
    if (top) {
      const k = o.top === 'hoodie' ? 0.86 : 0.46; // cuánta manga
      const ex = (1 - k) * (1 - k) * sxp + 2 * (1 - k) * k * mx + k * k * a.hx;
      const ey = (1 - k) * (1 - k) * syp + 2 * (1 - k) * k * my + k * k * a.hy;
      const qx = sxp + (mx - sxp) * k, qy = syp + (my - syp) * k;
      const sleeve = () => { g.beginPath(); g.moveTo(sxp, syp); g.quadraticCurveTo(qx, qy, ex, ey); };
      sleeve(); stroke(g, INK, 12);
      sleeve(); stroke(g, top.fill, 9.2);
      if (a.side > 0) { sleeve(); stroke(g, 'rgba(0,0,0,.2)', 9.2); }
    }
    ellipse(g, a.hx, a.hy, 4.6, 4.6, mix(sk.base, '#ffffff', 0.35), sk.line, 1.6);
  };

  /* --- torso --- */
  const torsoPath = () => {
    const y = sit ? 2 : 0;
    g.beginPath();
    g.moveTo(-11, -47 + y);
    g.bezierCurveTo(-18, -45 + y, -18, -30 + y, -16.5, -19 + y);
    g.quadraticCurveTo(-16, -13 + y, -10, -13 + y);
    g.lineTo(10, -13 + y);
    g.quadraticCurveTo(16, -13 + y, 16.5, -19 + y);
    g.bezierCurveTo(18, -30 + y, 18, -45 + y, 11, -47 + y);
    g.closePath();
  };
  const drawTorso = () => {
    torsoPath(); g.fillStyle = skinFill; g.fill();
    if (top) {
      torsoPath(); g.fillStyle = top.fill; g.fill();
      g.fillStyle = lgrad(g, -17, 0, 17, 0, [[0, 'rgba(255,255,255,.12)'], [0.35, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.32)']]); g.fill();
      g.save(); torsoPath(); g.clip();
      const rib = luma(top.tone) > 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.2)';
      if (o.top === 'hoodie') {
        g.fillStyle = rib; g.fillRect(-20, -18, 40, 6);
        if (!pose.back) {
          g.beginPath(); g.moveTo(-8, -27); g.lineTo(8, -27); g.lineTo(10, -18); g.lineTo(-10, -18); g.closePath();
          g.fillStyle = 'rgba(0,0,0,.14)'; g.fill(); stroke(g, 'rgba(23,23,27,.6)', 1.1);
        }
      } else {
        g.fillStyle = sk.dark; g.fillRect(-20, -15.5, 40, 4); // asoma el cuerpo bajo la camiseta
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-20, -17.5, 40, 2);
      }
      g.restore();
    } else {
      g.save(); torsoPath(); g.clip();
      ellipse(g, -7, -36, 5, 8, 'rgba(255,255,255,.45)', null, 0, 0.3);
      g.fillStyle = lgrad(g, -17, 0, 17, 0, [[0, 'rgba(255,255,255,0)'], [1, rgba(sk.dark, 0.55)]]); g.fillRect(-20, -50, 40, 40);
      // pantalón corto
      g.fillStyle = '#23232b'; g.fillRect(-20, -23, 40, 12);
      g.fillStyle = IRI[1]; g.fillRect(-20, -23, 40, 1.8);
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(-0.6, -21, 1.2, 10);
      g.restore();
      if (!pose.back) { // burbujita en el pecho
        ellipse(g, 6.5, -37, 3.4, 3.4, 'rgba(255,255,255,.35)', IRI[0], 1.3);
        ellipse(g, 5.5, -38, 0.9, 0.9, '#ffffff');
      }
    }
    torsoPath(); stroke(g, top ? INK : sk.line, 1.9);
    if (top && o.top === 'hoodie' && !pose.back) {
      g.beginPath(); g.moveTo(-3.5, -44); g.lineTo(-4.2, -33); g.moveTo(5, -44); g.lineTo(5.6, -35);
      stroke(g, luma(top.tone) > 0.6 ? '#3a3a42' : '#f2f0eb', 1.5);
    }
  };
  const hood = (over: boolean) => {
    if (!top || o.top !== 'hoodie') return;
    g.beginPath();
    if (over) { g.moveTo(-17, -46); g.quadraticCurveTo(-21, -58, -12, -62); g.quadraticCurveTo(0, -55, 12, -62); g.quadraticCurveTo(21, -58, 17, -46); g.quadraticCurveTo(0, -41, -17, -46); }
    else { g.moveTo(-19, -44); g.quadraticCurveTo(-25, -58, -15, -64); g.lineTo(15, -64); g.quadraticCurveTo(25, -58, 19, -44); g.quadraticCurveTo(0, -39, -19, -44); }
    g.closePath(); g.fillStyle = top.fill; g.fill();
    g.fillStyle = over ? 'rgba(0,0,0,.12)' : 'rgba(0,0,0,.3)'; g.fill(); stroke(g, INK, 1.8);
  };

  /* --- cabeza --- */
  const face = () => {
    const [lx, ly] = pose.look;
    const cx = hx + 4.5 + lx * 2.2, cy = hy + 2.5 + ly * 1.6;
    const blink = (t % 3.9) < 0.12 || (emote === 'none' && (t % 9.7) > 9.5);
    const wink = o.mood === 'pillo';
    const calm = o.mood === 'tranqui';
    [-1, 1].forEach((s) => {
      const ex = cx + s * 8.4, near = s > 0;
      const closed = blink || (wink && near && !party);
      if (closed || (calm && !party)) {
        g.beginPath();
        if (calm && !closed) g.arc(ex, cy + 1.5, 3.4, Math.PI * 1.1, Math.PI * 1.9);
        else { g.moveTo(ex - 3.4, cy + 0.5); g.quadraticCurveTo(ex, cy + 2.4, ex + 3.4, cy + 0.5); }
        stroke(g, '#1b1830', 1.9);
      } else if (party) {
        g.beginPath(); g.arc(ex, cy + 2, 3.6, Math.PI * 1.08, Math.PI * 1.92); stroke(g, '#1b1830', 2.1);
      } else {
        ellipse(g, ex, cy, near ? 3.7 : 3.2, 5.3, '#1b1830');
        ellipse(g, ex - 1.1 + lx * 0.6, cy - 1.9 + ly * 0.5, 1.5, 1.7, '#ffffff');
        ellipse(g, ex + 1.3, cy + 2.1, 0.7, 0.7, 'rgba(255,255,255,.8)');
      }
      ellipse(g, ex + s * 2.6, cy + 8.6, 4.4, 2.4, 'rgba(255,110,160,.36)');
    });
    const mx = cx, my = cy + 8.8;
    if (pose.talk > 0.05) ellipse(g, mx, my + 0.6, 2.7, 1.1 + pose.talk * 2.7, '#5a2338', '#1b1830', 1.1);
    else if (party) { g.beginPath(); g.arc(mx, my - 1.2, 4.4, 0.05 * Math.PI, 0.95 * Math.PI); g.closePath(); g.fillStyle = '#5a2338'; g.fill(); stroke(g, '#1b1830', 1.2); }
    else { g.beginPath(); g.arc(mx, my - 2.6, 4.1, 0.2 * Math.PI, 0.8 * Math.PI); stroke(g, '#1b1830', 1.7); }
    if (o.face === 'shades') {
      rrect(g, cx - 14.4, cy - 5.2, 13, 9.6, 3.2); g.fillStyle = '#0d0d10'; g.fill(); stroke(g, INK, 1.2);
      rrect(g, cx + 2.6, cy - 5.2, 13, 9.6, 3.2); g.fillStyle = '#0d0d10'; g.fill(); stroke(g, INK, 1.2);
      g.beginPath(); g.moveTo(cx - 1.6, cy - 2.2); g.lineTo(cx + 2.8, cy - 2.2); stroke(g, INK, 1.8);
      g.beginPath(); g.moveTo(cx - 12, cy - 2.6); g.lineTo(cx - 8.4, cy - 2.6); g.moveTo(cx + 5, cy - 2.6); g.lineTo(cx + 8.6, cy - 2.6); stroke(g, IRI[0], 1.5);
    } else if (o.face === 'round') {
      [-1, 1].forEach((s) => ellipse(g, cx + s * 8.4, cy + 0.4, 6.6, 6.6, 'rgba(255,255,255,.16)', '#1b1830', 1.5));
      g.beginPath(); g.moveTo(cx - 1.8, cy); g.lineTo(cx + 1.8, cy); stroke(g, '#1b1830', 1.5);
    }
  };
  const hat = () => {
    if (o.head === 'none') return;
    const h = cloth(g, o.headPattern, o.headColor);
    if (o.head === 'beanie') {
      ellipse(g, hx, hy - R - 5.5, 6.2, 6.2, luma(h.tone) > 0.75 ? '#c9a7ff' : '#f2f0eb', INK, 1.7);
      g.beginPath(); g.arc(hx, hy, R + 1.6, Math.PI * 1.04, Math.PI * 1.96); g.quadraticCurveTo(hx, hy - 6, hx - (R + 1.6) * Math.cos(Math.PI * 0.04), hy - (R + 1.6) * Math.sin(Math.PI * 0.04)); g.closePath();
      g.fillStyle = h.fill; g.fill();
      g.fillStyle = lgrad(g, hx - R, 0, hx + R, 0, [[0, 'rgba(255,255,255,.14)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.3)']]); g.fill(); stroke(g, INK, 1.8);
      rrect(g, hx - R - 2.4, hy - 13, (R + 2.4) * 2, 10.5, 4.6);
      g.fillStyle = shade(h.tone, luma(h.tone) > 0.5 ? -0.14 : 0.18); g.fill(); stroke(g, INK, 1.8);
      g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1;
      for (let x = hx - R + 2; x < hx + R; x += 4.6) { g.beginPath(); g.moveTo(x, hy - 11.4); g.lineTo(x, hy - 4.2); g.stroke(); }
    } else {
      const col = o.headColor ?? '#2a2a30';
      if (!pose.back) { g.beginPath(); g.ellipse(hx + 21, hy - 11, 13, 4.4, 0.12, 0, TAU); g.fillStyle = shade(col, -0.25); g.fill(); stroke(g, INK, 1.7); }
      g.beginPath(); g.arc(hx, hy, R + 1.2, Math.PI * 1.1, Math.PI * 1.97); g.closePath();
      g.fillStyle = h.fill; g.fill(); g.fillStyle = 'rgba(0,0,0,.12)'; g.fill(); stroke(g, INK, 1.8);
      ellipse(g, hx, hy - R - 1, 2.2, 1.6, shade(col, 0.3), INK, 1.2);
    }
  };

  /* --- orden de pintado --- */
  const arms = [arm(-1), arm(1)];
  leg(-1); leg(1);
  if (!pose.back) hood(false);
  arms.filter((a) => !a.up).forEach(drawArm);
  drawTorso();
  if (!top) { // pañuelo irisado al cuello
    g.beginPath(); g.moveTo(-12.5, -46.5); g.quadraticCurveTo(0, -40.5, 12.5, -46.5);
    stroke(g, sk.line, 6.4); stroke(g, lgrad(g, -13, 0, 13, 0, [[0, IRI[0]], [0.5, IRI[1]], [1, IRI[2]]]), 3.8);
    if (!pose.back) { poly(g, [[7, -44.5], [13.5, -36], [5.5, -38.5]], IRI[2], sk.line, 1.3); }
  }
  if (o.head === 'none') { // la pompa pequeña que la sigue
    bubble(g, hx - 21 - Math.sin(t * 1.7) * 1.5, hy - 29 + Math.sin(t * 2.6) * 2, 5.4, sk, t);
  }
  bubble(g, hx, hy, R, sk, 0.6 + Math.sin(t * 0.7) * 0.5);
  if (!pose.back) face();
  hat();
  if (pose.back) hood(true);
  arms.filter((a) => a.up).forEach(drawArm);
  g.restore();
}

/** Sombra de contacto de un personaje, en el suelo. */
export function drawShadow(g: G, rx: number, lift = 0) {
  const k = Math.max(0.55, 1 - lift / 70);
  ellipse(g, 0, 0, rx * k, rx * 0.42 * k, `rgba(0,0,0,${(0.3 * k).toFixed(3)})`);
}

/* ---------------- Daniel ---------------- */
export type DanielPose = { t: number; wave: boolean; talk: number; look: number };
export function drawDaniel(g: G, p: DanielPose) {
  const base = '#f7c4d4', dark = '#e193b0', line = '#4a2236', light = '#fde6ee';
  const bob = Math.sin(p.t * 1.8) * 1.2;
  g.save(); g.translate(0, bob); g.lineJoin = 'round'; g.lineCap = 'round';
  // piernas
  [-1, 1].forEach((s) => {
    g.beginPath(); g.moveTo(s * 9, -14); g.lineTo(s * 9, -5 - bob); stroke(g, line, 7.5); stroke(g, dark, 5);
    rrect(g, s * 9 - 7, -6.5 - bob, 14, 7.5, 3.6); g.fillStyle = '#f7f5f0'; g.fill(); stroke(g, INK, 1.5);
  });
  // brazo que no saluda
  g.beginPath(); g.moveTo(22, -50); g.quadraticCurveTo(31, -44, 29, -33); stroke(g, line, 8.5); stroke(g, dark, 5.8);
  ellipse(g, 29, -32, 4.4, 4.4, light, line, 1.5);
  // pastilla
  rrect(g, -24, -80, 48, 68, 13);
  g.fillStyle = lgrad(g, -24, 0, 24, 0, [[0, light], [0.22, base], [0.72, base], [1, dark]]); g.fill();
  g.save(); g.clip();
  g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-24, -80, 48, 7);
  g.fillStyle = 'rgba(180,80,120,.2)'; g.fillRect(-24, -19, 48, 7);
  g.restore();
  rrect(g, -24, -80, 48, 68, 13); stroke(g, line, 2.1);
  rrect(g, -19, -75, 38, 58, 9); stroke(g, 'rgba(255,255,255,.55)', 1.3);
  // la S grabada
  g.font = `700 25px ${FONT_SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('S', 0.9, -27);
  g.fillStyle = dark; g.fillText('S', 0, -28);
  // cara
  const lx = p.look * 1.6;
  const blink = (p.t % 4.3) < 0.13;
  [-1, 1].forEach((s) => {
    if (blink) { g.beginPath(); g.moveTo(s * 9 - 3 + lx, -57); g.lineTo(s * 9 + 3 + lx, -57); stroke(g, line, 1.9); }
    else { ellipse(g, s * 9 + lx, -58, 3, 4.4, line); ellipse(g, s * 9 - 0.9 + lx, -59.6, 1.2, 1.4, '#ffffff'); }
    ellipse(g, s * 13.5 + lx, -50.5, 4.2, 2.3, 'rgba(255,100,150,.4)');
  });
  if (p.talk > 0.05) ellipse(g, lx, -49, 3, 1.2 + p.talk * 2.8, '#7a2a48', line, 1.1);
  else { g.beginPath(); g.arc(lx, -53, 5, 0.18 * Math.PI, 0.82 * Math.PI); stroke(g, line, 1.8); }
  // espuma en la cabeza
  [[-13, -81, 6.5], [-3, -85, 8], [8, -83, 6.5], [15, -79, 4.6], [-19, -78, 4]].forEach(([x, y, r]) => ellipse(g, x!, y!, r!, r!, '#ffffff', line, 1.5));
  ellipse(g, -5, -88, 2.2, 1.5, 'rgba(155,231,255,.8)');
  ellipse(g, -16, -66, 3.2, 5, 'rgba(255,255,255,.75)', null, 0, 0.35);
  // brazo que saluda
  const wy = p.wave ? -76 + Math.sin(p.t * 12) * 2 : -33, wx = p.wave ? -34 + Math.sin(p.t * 12) * 4 : -29;
  g.beginPath(); g.moveTo(-22, -50); g.quadraticCurveTo(p.wave ? -34 : -31, p.wave ? -56 : -44, wx, wy); stroke(g, line, 8.5); stroke(g, base, 5.8);
  ellipse(g, wx, wy, 4.6, 4.6, light, line, 1.5);
  g.restore();
}

/* ---------------- Rumbi ---------------- */
export function drawRumbi(g: G, t: number, happy: boolean) {
  g.save(); g.lineJoin = 'round';
  const y = -5;
  g.beginPath(); g.ellipse(0, y + 5, 19, 9.5, 0, 0, Math.PI); g.lineTo(-19, y); g.ellipse(0, y, 19, 9.5, 0, Math.PI, 0, true); g.closePath();
  g.fillStyle = lgrad(g, -19, 0, 19, 0, [[0, '#4a4a54'], [0.5, '#2b2b31'], [1, '#17171b']]); g.fill(); stroke(g, INK, 1.6);
  ellipse(g, 0, y, 19, 9.5, rgrad(g, -6, y - 3, 1, 22, [[0, '#5c5c68'], [1, '#2f2f37']]), INK, 1.6);
  ellipse(g, 0, y, 12.5, 6.2, null, 'rgba(255,255,255,.14)', 1.2);
  // pantallita con ojos
  g.save(); g.transform(1, 0.5, -1, 0.5, 0, y - 0.5);
  rrect(g, -5.5, -5.5, 11, 11, 2.5); g.fillStyle = '#0b1418'; g.fill();
  g.fillStyle = happy ? '#8ff0a4' : '#9be7ff';
  const blink = (t % 3.1) < 0.15;
  if (blink) { g.fillRect(-3.4, -0.5, 2.4, 1); g.fillRect(1, -0.5, 2.4, 1); } else { g.fillRect(-3.2, -2.2, 2, 3.4); g.fillRect(1.2, -2.2, 2, 3.4); }
  g.restore();
  ellipse(g, 13, y + 3.4, 1.5, 1, (t % 1.2) < 0.6 ? '#8ff0a4' : '#2c6b40');
  g.restore();
}
