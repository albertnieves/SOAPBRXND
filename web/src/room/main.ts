/*
 * Lavandería SOAPBRXND: la portada de la tienda como una sala isométrica que se recorre con Pompa.
 * Este archivo monta el HUD, la cámara, la entrada (ratón, dedos y teclado) y los paneles.
 * El dibujo vive en scene.ts (sala), chars.ts (personajes) y art.ts (piezas y artes);
 * las reglas sin DOM, en logic.ts.
 */
import type { RoomArtwork, RoomData, RoomItem, RoomWasher } from '@/modules/catalog/room';
import { icon, pieceURL, swatchURL } from './art';
import { DEFAULT_OUTFIT, drawDaniel, drawPompa, drawRumbi, drawShadow, EMOTE_TIME, FACES, IRI, MOODS, POSE, SKINS, type Emote, type Outfit, type Pose } from './chars';
import { clamp, COLS, ellipse, esc, P, poly, put, rgrad, ROWS, store, TAU, unproject, zFace, type G } from './core';
import { bagCount, danielReply, daylight, euro, findPath, isMoveKey, keyStep, nearestFree, opensLabel, PHASE_LABEL, washerStatus, type Tile } from './logic';
import { buildScene, hits, SOCK_SPOTS, type Env, type Item, type Scene } from './scene';

const BRAND = 'SOAPBRXND';

type Walker = { x: number; y: number; path: [number, number][]; facing: 1 | -1; back: boolean; walk: number; speed: number };
type Pompa = Walker & { emote: Emote; et: number; talkUntil: number; hiddenUntil: number; onArrive: (() => void) | null; seat: number | null; z: number };
type Speaker = { x: number; y: number; z?: number; name: () => string; head: number };

const TEMPLATE = `
<div id="stage" tabindex="0" aria-label="La lavandería de SOAPBRXND: una sala que recorres con tu personaje. Toca el suelo para moverte y los muebles para usarlos. Todo lo que hay en la sala está también en los botones.">
  <canvas id="room"></canvas>
  <div id="tags"></div>
  <div id="says"></div>
</div>
<div id="tip"></div>

<button class="chip" data-act="login" aria-label="Tu perfil">
  <canvas id="chipAv" width="72" height="72"></canvas>
  <span class="who"><span id="nick">INVITADO</span><small>ENTRAR</small></span>
</button>
<button class="socks" data-act="socks" aria-label="Calcetines perdidos">${icon('sock')}<span id="sockN">0/5</span></button>

<nav class="rail left" aria-label="Lavandería">
  <button class="rbtn" data-act="drops">${icon('washer')}DROPS</button>
  <button class="rbtn" data-act="wardrobe">${icon('hanger')}VESTIDOR</button>
  <button class="rbtn" data-act="key">${icon('key')}TU LLAVE</button>
  <button class="rbtn" data-act="artworks">${icon('frame')}ARTES</button>
</nav>
<nav class="rail right" aria-label="Información">
  <button class="rbtn" data-act="story">${icon('book')}HISTORIA</button>
  <button class="rbtn" data-act="contact">${icon('mail')}CONTACTO</button>
  <button class="rbtn" data-act="shipping">${icon('truck')}ENVÍOS</button>
  <button class="rbtn" data-act="returns">${icon('back')}DEVOLUC.</button>
</nav>

<div class="tools" role="group" aria-label="Sala">
  <div class="emotes" id="emotes" hidden>
    <button data-act="emote" data-v="wave">SALUDAR<kbd>1</kbd></button>
    <button data-act="emote" data-v="jump">SALTAR<kbd>2</kbd></button>
    <button data-act="emote" data-v="dance">BAILAR<kbd>3</kbd></button>
    <button data-act="emote" data-v="cheer">CELEBRAR<kbd>4</kbd></button>
  </div>
  <button class="tbtn" data-act="emotes" aria-label="Gestos de Pompa" aria-expanded="false" aria-controls="emotes">${icon('smile')}</button>
  <button class="tbtn" data-act="lights" id="lightBtn" aria-label="Cambiar la luz de la sala">${icon('moon')}</button>
  <button class="tbtn" data-act="sound" id="soundBtn" aria-label="Activar el sonido" aria-pressed="false">${icon('mute')}</button>
  <button class="tbtn" data-act="zoom-in" aria-label="Acercar">+</button>
  <button class="tbtn" data-act="zoom-out" aria-label="Alejar">−</button>
  <button class="tbtn" data-act="help" aria-label="Cómo se usa la sala">?</button>
</div>

<div id="ask">
  <div class="quick" id="quick">
    <button data-say="Recomiéndame algo">RECOMIÉNDAME ALGO</button>
    <button data-say="¿Qué talla soy?">¿QUÉ TALLA SOY?</button>
    <button data-say="¿Qué drops hay?">DROPS</button>
    <button data-say="¿Cómo van los envíos?">ENVÍOS</button>
  </div>
  <form id="chat" autocomplete="off">
    <input id="chatIn" maxlength="120" placeholder="Habla con Daniel… (tallas, drops, envíos)" aria-label="Mensaje para Daniel">
    <button type="submit">DECIR</button>
  </form>
</div>

<nav id="dock" aria-label="Tienda">
  <button class="dbtn" data-act="catalog">${icon('grid')}PRODUCTOS</button>
  <button class="dbtn shop" data-act="home">SHOP</button>
  <a class="dbtn" href="/bolsa">${icon('bag')}BOLSA<span class="n" id="bagN"></span></a>
</nav>

<div id="toast" role="status" aria-live="polite"></div>

<div id="panel" hidden>
  <div class="win" role="dialog" aria-modal="true" aria-labelledby="pTitle">
    <header><h2 id="pTitle"></h2><button data-act="close" aria-label="Cerrar">X</button></header>
    <div class="body" id="pBody"></div>
  </div>
</div>

<div id="intro">
  <div>
    <div class="logo" aria-hidden="true">${BRAND}</div>
    <div class="sub">LAVANDERÍA DE DROPS · ABIERTA 24H</div>
    <canvas class="pompa" id="introPompa" width="240" height="260"></canvas>
    <div class="bar"><i></i></div>
    <button class="pbtn" id="enter" disabled>CARGANDO…</button>
    <p class="hint">Toca el suelo para moverte · flechas o WASD · E para usar</p>
  </div>
</div>
`;

export function mount(ROOT: HTMLElement): void {
  if (ROOT.dataset.on) return;
  ROOT.dataset.on = '1';
  ROOT.innerHTML = TEMPLATE;
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => ROOT.querySelector(s) as T;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  /* ---------------- estado ---------------- */
  let DATA: RoomData = { washers: [], items: [], artworks: [] };
  let scene: Scene;
  let nick = store.get('nick', 'INVITADO');
  const outfit: Outfit = { ...DEFAULT_OUTFIT, ...store.get<Partial<Outfit>>('outfit3', {}) };
  const socks: number[] = store.get<number[]>('socks', []).filter((n) => Number.isInteger(n) && n >= 0 && n < SOCK_SPOTS.length);
  const hour = new Date().getHours();
  const env: Env = { lightsOn: store.get<boolean | null>('lights', null) ?? daylight(hour) !== 'noche', sky: daylight(hour), res: 1.5, socks };
  let soundOn = false;

  const pompa: Pompa = { x: 0.5, y: 8.5, path: [], facing: 1, back: false, walk: 0, speed: 3.5, emote: 'none', et: 0, talkUntil: 0, hiddenUntil: 0, onArrive: null, seat: null, z: 0 };
  const daniel = { x: 9.9, y: 1.32, waveUntil: 0, talkUntil: 0 };
  const rumbi: Walker & { wait: number; happyUntil: number } = { x: 6.5, y: 7.5, path: [], facing: 1, back: false, walk: 0, speed: 1.15, wait: 3, happyUntil: 0 };
  const WHO: Record<'pompa' | 'daniel' | 'rumbi', Speaker> = {
    pompa: { get x() { return pompa.x; }, get y() { return pompa.y; }, get z() { return pompa.z; }, name: () => nick, head: 100 },
    daniel: { get x() { return daniel.x; }, get y() { return daniel.y; }, name: () => 'DANIEL', head: 100 },
    rumbi: { get x() { return rumbi.x; }, get y() { return rumbi.y; }, name: () => 'RUMBI', head: 30 },
  };

  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < COLS && y < ROWS && !scene.blocked.has(x + ',' + y);
  const item = (slug: string) => DATA.items.find((i) => i.slug === slug);

  /* ---------------- sonido (apagado hasta que se pide) ---------------- */
  let actx: AudioContext | null = null;
  function sfx(kind: 'pop' | 'ding' | 'step' | 'open' | 'bip' | 'no') {
    if (!soundOn) return;
    try {
      actx = actx ?? new AudioContext();
      const t0 = actx.currentTime, o = actx.createOscillator(), v = actx.createGain();
      const [f0, f1, dur, type, vol]: [number, number, number, OscillatorType, number] = {
        pop: [520, 980, 0.09, 'sine', 0.08], ding: [1320, 1320, 0.5, 'sine', 0.09], step: [180, 120, 0.05, 'triangle', 0.03],
        open: [330, 660, 0.14, 'triangle', 0.06], bip: [880, 1320, 0.12, 'square', 0.03], no: [220, 150, 0.2, 'sawtooth', 0.04],
      }[kind] as [number, number, number, OscillatorType, number];
      o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      v.gain.setValueAtTime(vol, t0); v.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(v); v.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
      if (kind === 'ding') { const o2 = actx.createOscillator(), v2 = actx.createGain(); o2.frequency.value = 1980; v2.gain.setValueAtTime(0.05, t0 + 0.08); v2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6); o2.connect(v2); v2.connect(actx.destination); o2.start(t0 + 0.08); o2.stop(t0 + 0.62); }
    } catch { /* sin audio */ }
  }

  /* ---------------- bocadillos ---------------- */
  const saysEl = $('#says');
  type Bubble = { who: Speaker; el: HTMLElement; until: number };
  const bubbles: Bubble[] = [];
  function say(who: Speaker, text: string, ms = 5200) {
    const el = document.createElement('div');
    el.className = 'say';
    el.innerHTML = `<b>${esc(who.name())}</b>${esc(text)}`;
    saysEl.appendChild(el);
    bubbles.push({ who, el, until: performance.now() + ms });
    while (bubbles.filter((b) => b.who === who).length > 2) { const old = bubbles.find((b) => b.who === who)!; old.el.remove(); bubbles.splice(bubbles.indexOf(old), 1); }
    const talk = performance.now() + Math.min(2200, 500 + text.length * 28);
    if (who === WHO.pompa) pompa.talkUntil = talk;
    if (who === WHO.daniel) daniel.talkUntil = talk;
  }

  /* ---------------- pompas de jabón ---------------- */
  type Part = { x: number; y: number; r: number; t: number; life: number; ph: number; col: string; vy: number };
  const parts: Part[] = [];
  function bubbleAt(x: number, y: number, r?: number) {
    if (parts.length > 90) return;
    parts.push({ x, y, r: r ?? 2 + Math.random() * 5, t: 0, life: 2.4 + Math.random() * 2.6, ph: Math.random() * 6, col: IRI[Math.floor(Math.random() * 3)]!, vy: 16 + Math.random() * 22 });
  }
  function burst(x: number, y: number, z: number, n: number) {
    const [sx, sy] = P(x, y, z);
    for (let i = 0; i < n; i++) bubbleAt(sx - 20 + Math.random() * 40, sy - 20 - Math.random() * 40);
  }

  /* ---------------- cámara ---------------- */
  const stage = $('#stage');
  const room = $<HTMLCanvasElement>('#room');
  const g = room.getContext('2d')!;
  const cam = { s: 1, x: 0, y: 0, fit: 1, min: 0.5, max: 2.6, follow: false };
  let dpr = 1, VW = 0, VH = 0;
  const BOTTOM = 112; // lo que tapan el chat y la barra
  function resize(recenter: boolean) {
    VW = innerWidth; VH = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    room.width = Math.round(VW * dpr); room.height = Math.round(VH * dpr);
    room.style.width = VW + 'px'; room.style.height = VH + 'px';
    if (!scene) return;
    const b = scene.bg;
    cam.fit = Math.min(VW / (b.w + 24), (VH - BOTTOM - 16) / (b.h - 20));
    cam.min = Math.min(cam.fit, 0.5); cam.max = 2.6;
    if (recenter) { cam.s = clamp(cam.fit, 0.62, 1.7); centerOn(...P(5.2, 4.2, 60)); }
    clampCam();
  }
  function centerOn(wx: number, wy: number) { cam.x = VW / 2 - wx * cam.s; cam.y = (VH - BOTTOM) / 2 - wy * cam.s; clampCam(); }
  function clampCam() {
    const b = scene.bg, w = b.w * cam.s, h = b.h * cam.s, availH = VH - BOTTOM;
    cam.x = w <= VW ? (VW - w) / 2 - b.x * cam.s : clamp(cam.x, VW - (b.x + b.w) * cam.s - 12, -b.x * cam.s + 12);
    cam.y = h <= availH ? (availH - h) / 2 - b.y * cam.s : clamp(cam.y, availH - (b.y + b.h) * cam.s - 12, -b.y * cam.s + 12);
  }
  let resTimer = 0;
  function zoomAt(cx: number, cy: number, k: number) {
    const s = clamp(cam.s * k, cam.min, cam.max);
    if (s === cam.s) return;
    const wx = (cx - cam.x) / cam.s, wy = (cy - cam.y) / cam.s;
    cam.s = s; cam.x = cx - wx * s; cam.y = cy - wy * s; clampCam();
    clearTimeout(resTimer); resTimer = window.setTimeout(sharpen, 260);
  }
  const wantRes = () => clamp(dpr * cam.s * 1.12, 1, coarse ? 2 : 3);
  /** Si el zoom ha dejado los sprites borrosos (o sobrados), se vuelven a dibujar a la resolución nueva. */
  function sharpen() { const w = wantRes(); if (w > env.res * 1.25 || w < env.res * 0.6) rebuild(); }
  const toWorld = (cx: number, cy: number): [number, number] => [(cx - cam.x) / cam.s, (cy - cam.y) / cam.s];
  const toScreen = (wx: number, wy: number): [number, number] => [cam.x + wx * cam.s, cam.y + wy * cam.s];

  /* ---------------- escena ---------------- */
  const tagsEl = $('#tags');
  const tagEls = new Map<string, HTMLElement>();
  function rebuild() {
    env.res = wantRes();
    scene = buildScene(DATA, env);
    daniel.x = scene.daniel[0]; daniel.y = scene.daniel[1];
    tagsEl.innerHTML = ''; tagEls.clear();
    scene.items.forEach((it) => {
      if (!it.act || it.tag === null || (it.tag === undefined && it.quiet)) return;
      const el = document.createElement('span');
      el.className = 'ftag' + (it.quiet ? ' quiet' : ''); el.textContent = it.tag ?? (it.label ?? '').split(' · ')[0]!;
      tagsEl.appendChild(el); tagEls.set(it.id, el);
    });
    hoverItem = null;
  }

  /* ---------------- moverse ---------------- */
  function standUp() {
    if (pompa.seat === null) return;
    pompa.seat = null; pompa.z = 0; pompa.emote = 'none';
    const t = nearestFree(Math.floor(pompa.x) - 1, Math.floor(pompa.y), free) ?? [10, 6];
    pompa.x = t[0] + 0.5; pompa.y = t[1] + 0.5;
  }
  function walkTo(tx: number, ty: number, onArrive?: () => void): boolean {
    standUp();
    const start = pompa.path.length ? pompa.path[0]! : [pompa.x, pompa.y];
    const route = findPath(Math.floor(start[0]!), Math.floor(start[1]!), tx, ty, free);
    if (!route) return false;
    pompa.path = pompa.path.length ? [pompa.path[0]!, ...route] : route;
    pompa.onArrive = onArrive ?? null;
    if (pompa.emote !== 'none') pompa.emote = 'none';
    if (!pompa.path.length && onArrive) { pompa.onArrive = null; onArrive(); }
    return true;
  }
  function face(c: Walker, wx: number, wy: number) {
    const dx = wx - c.x, dy = wy - c.y, sdx = dx - dy;
    if (Math.abs(sdx) > 0.01) c.facing = sdx > 0 ? 1 : -1;
  }
  function goUse(it: Item) {
    if (!it.act) return;
    const act = it.act;
    const done = () => { face(pompa, (it.box[0] + it.box[2]) / 2, (it.box[1] + it.box[3]) / 2); pompa.back = false; run(act, it); };
    const use = it.use ?? nearestFree(Math.floor(it.box[0]), Math.floor(it.box[1]), free);
    if (!use) return done();
    if (Math.floor(pompa.x) === use[0] && Math.floor(pompa.y) === use[1] && !pompa.path.length && pompa.seat === null) return done();
    if (!walkTo(use[0], use[1], done)) {
      const near = nearestFree(use[0], use[1], free);
      if (!near || !walkTo(near[0], near[1], done)) done();
    }
  }
  function step(c: Walker, dt: number): boolean {
    if (!c.path.length) return false;
    const [tx, ty] = c.path[0]!;
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy), s = c.speed * dt;
    if (d > 0.001) { face(c, tx, ty); c.back = dx + dy < -0.05; }
    if (d <= s) { c.x = tx; c.y = ty; c.path.shift(); } else { c.x += (dx / d) * s; c.y += (dy / d) * s; }
    c.walk += dt * c.speed * 3.3;
    return true;
  }
  function emote(e: Emote) {
    if (pompa.seat !== null && e !== 'sit') standUp();
    pompa.path = []; pompa.onArrive = null; pompa.emote = e; pompa.et = 0; pompa.back = false;
    if (e === 'cheer' || e === 'jump') burst(pompa.x, pompa.y, 60, 6);
    sfx('pop');
  }

  /* ---------------- acciones de la sala ---------------- */
  const VENDING = ['Lava del revés y a 30 °C: el estampado te lo agradece.', 'La secadora encoge más que los lunes.', 'Un calcetín suelto no está perdido: está explorando.', 'Separa por colores. Los drops, no.', 'Tela cortada a medida: mide dos veces, corta una.'];
  const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!;
  function run(act: string, it?: Item) {
    const [kind, arg = ''] = act.split(':');
    switch (kind) {
      case 'drop': return openDrop(arg);
      case 'piece': return openPiece(arg);
      case 'art': return openArt(arg);
      case 'cat': return openCatalog(arg);
      case 'wardrobe': pompa.hiddenUntil = performance.now() + 700; burst(pompa.x, pompa.y, 40, 10); return void setTimeout(openWardrobe, 420);
      case 'daniel': return talkDaniel();
      case 'look': return openLook();
      case 'exit': return openPanel('SALIDA', `<p>¿Prefieres la tienda sin sala? Todo lo de aquí está también en páginas normales.</p><div class="row"><a class="pbtn" href="/drops">DROPS</a><a class="pbtn" href="/artes">ARTES</a><button class="pbtn ghost" data-act="close">ME QUEDO</button></div>`);
      case 'lights': return toggleLights();
      case 'vending': sfx('ding'); burst(7.5, 1.2, 60, 8); return say(WHO.pompa, pick(VENDING), 6000);
      case 'wet': return say(WHO.pompa, pick(['Rumbi acaba de pasar por aquí.', 'Resbala. Lo sé por experiencia.']));
      case 'sit': return sit();
      case 'sock': return foundSock(Number(arg), it);
    }
  }
  function sit() {
    const k = Math.random() < 0.5 ? 0 : 1, s = scene.seats[k]!;
    pompa.path = []; pompa.seat = k; pompa.x = s.x; pompa.y = s.y; pompa.z = s.z; pompa.facing = -1; pompa.back = false; pompa.emote = 'sit'; pompa.et = 0;
    say(WHO.pompa, pick(['Esperando a que acabe el centrifugado…', 'Huele a suavizante.', 'Desde aquí se ve toda la lavandería.']));
  }
  function refreshSocks() { $('#sockN').textContent = `${socks.length}/${SOCK_SPOTS.length}`; ROOT.classList.toggle('all-socks', socks.length >= SOCK_SPOTS.length); }
  function foundSock(i: number, it?: Item) {
    if (socks.includes(i) || !(i >= 0 && i < SOCK_SPOTS.length)) return;
    socks.push(i); store.set('socks', socks); refreshSocks();
    if (it) scene.items.splice(scene.items.indexOf(it), 1);
    const el = tagEls.get('sock' + i); if (el) el.remove();
    hoverItem = null;
    emote('cheer'); sfx('ding');
    if (socks.length >= SOCK_SPOTS.length) {
      toast('LOS CINCO CALCETINES · PIEL «CALCETÍN DE ORO» DESBLOQUEADA');
      burst(pompa.x, pompa.y, 40, 24);
      setTimeout(() => { daniel.waveUntil = performance.now() + 2200; say(WHO.daniel, 'Los cinco. Nadie lo había conseguido. Pásate por el vestidor: hay una piel nueva para ti.', 8000); }, 900);
    } else {
      toast(`CALCETÍN ${socks.length} DE ${SOCK_SPOTS.length}`);
      say(WHO.pompa, pick(['¡Un calcetín perdido!', '¿De quién será este?', 'Otro para la colección.']));
    }
  }
  function toggleLights() {
    env.lightsOn = !env.lightsOn; store.set('lights', env.lightsOn);
    rebuild(); refreshLightBtn(); sfx('open');
    toast(env.lightsOn ? 'LUZ DE DÍA' : 'LUZ DE AMBIENTE');
  }
  function refreshLightBtn() { const b = $('#lightBtn'); b.innerHTML = icon(env.lightsOn ? 'moon' : 'sun'); b.setAttribute('aria-label', env.lightsOn ? 'Poner luz de ambiente' : 'Poner luz de día'); }

  /* ---------------- pintar ---------------- */
  let hoverTile: Tile | null = null, hoverItem: Item | null = null, hoverChar: 'daniel' | 'rumbi' | 'pompa' | null = null;
  let pointer: [number, number] | null = null;
  let target: { x: number; y: number; t: number } | null = null;
  type Drawable = { item?: Item; who?: 'pompa' | 'daniel' | 'rumbi' };
  let order: Drawable[] = [];
  const charBB = (who: 'pompa' | 'daniel' | 'rumbi'): [number, number, number, number] => {
    const c = WHO[who], [sx, sy] = P(c.x, c.y, c.z ?? 0);
    return who === 'rumbi' ? [sx - 20, sy - 18, sx + 20, sy + 8] : [sx - 26, sy - 98, sx + 26, sy + 8];
  };
  const overlap = (a: readonly number[], b: readonly number[]) => a[0]! < b[2]! && b[0]! < a[2]! && a[1]! < b[3]! && b[1]! < a[3]!;
  function computeOrder() {
    const key = (i: Item) => i.box[0] + i.box[2] + i.box[1] + i.box[3] + (i.bias ?? 0);
    const furn = scene.items.filter((i) => !i.wall).sort((a, b) => key(a) - key(b));
    const chars = (['pompa', 'daniel', 'rumbi'] as const).slice().sort((a, b) => (WHO[a].x + WHO[a].y) - (WHO[b].x + WHO[b].y));
    const slots = new Map<number, ('pompa' | 'daniel' | 'rumbi')[]>();
    chars.forEach((who) => {
      const c = WHO[who], cb = charBB(who);
      let idx = furn.length;
      if (!(who === 'pompa' && pompa.seat !== null)) furn.forEach((f, i) => {
        const inFront = c.x >= f.box[2] || c.y >= f.box[3];
        if (!inFront && overlap(cb, [f.spr.x, f.spr.y, f.spr.x + f.spr.w, f.spr.y + f.spr.h])) idx = Math.min(idx, i);
      });
      if (!slots.has(idx)) slots.set(idx, []);
      slots.get(idx)!.push(who);
    });
    const out: Drawable[] = scene.items.filter((i) => i.wall).map((i) => ({ item: i }));
    furn.forEach((f, i) => { (slots.get(i) ?? []).forEach((who) => out.push({ who })); out.push({ item: f }); });
    (slots.get(furn.length) ?? []).forEach((who) => out.push({ who }));
    order = out;
  }
  function drawItem(it: Item, t: number) {
    const dy = it.jig && !reduceMotion ? it.jig(t) : 0;
    if (hoverItem === it) { g.save(); g.shadowColor = 'rgba(255,255,255,.95)'; g.shadowBlur = 14 * dpr; put(g, it.spr, 0, dy); g.restore(); }
    put(g, it.spr, 0, dy);
    if (it.live) { g.save(); g.translate(0, dy); it.live(g, reduceMotion ? 0 : t); g.restore(); }
  }
  const pose: Pose = { ...POSE };
  function drawWho(who: 'pompa' | 'daniel' | 'rumbi', now: number, t: number) {
    if (who === 'pompa') {
      if (pompa.hiddenUntil > now) return;
      const [sx, sy] = P(pompa.x, pompa.y, pompa.z);
      const lift = pompa.emote === 'jump' ? Math.sin(Math.min(1, pompa.et / EMOTE_TIME.jump) * Math.PI) * 30 : 0;
      g.save(); g.translate(sx, sy);
      if (pompa.seat === null) drawShadow(g, 19, lift);
      if (hoverChar === 'pompa') { g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 12 * dpr; }
      pose.t = t; pose.walk = pompa.walk; pose.moving = pompa.path.length > 0; pose.facing = pompa.facing; pose.back = pompa.back && pompa.path.length > 0;
      pose.emote = pompa.emote; pose.et = pompa.et; pose.talk = pompa.talkUntil > now ? Math.abs(Math.sin(now / 70)) : 0;
      if (pointer) { const [hx, hy] = toScreen(sx, sy - 66); pose.look = [clamp((pointer[0] - hx) / 260, -1, 1) * pompa.facing, clamp((pointer[1] - hy) / 260, -1, 1)]; } else pose.look = [0, 0];
      g.scale(1.1, 1.1); drawPompa(g, outfit, pose);
      g.restore();
    } else if (who === 'daniel') {
      const [sx, sy] = P(daniel.x, daniel.y);
      g.save(); g.translate(sx, sy); drawShadow(g, 24);
      if (hoverChar === 'daniel') { g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 12 * dpr; }
      const [px] = P(pompa.x, pompa.y);
      drawDaniel(g, { t, wave: daniel.waveUntil > now, talk: daniel.talkUntil > now ? Math.abs(Math.sin(now / 70)) : 0, look: clamp((px - sx) / 240, -1, 1) });
      g.restore();
    } else {
      const [sx, sy] = P(rumbi.x, rumbi.y);
      g.save(); g.translate(sx, sy); drawShadow(g, 20);
      if (hoverChar === 'rumbi') { g.shadowColor = 'rgba(255,255,255,.9)'; g.shadowBlur = 12 * dpr; }
      drawRumbi(g, t, rumbi.happyUntil > now);
      g.restore();
    }
  }
  function drawBubble(b: Part) {
    const x = b.x + Math.sin(b.t * 2 + b.ph) * 5, y = b.y, k = b.t > b.life - 0.18 ? 1.5 : Math.min(1, b.t * 5);
    if (b.t > b.life - 0.18) { // estalla
      g.strokeStyle = b.col; g.lineWidth = 1.2;
      for (let a = 0; a < 6; a++) { const an = (a / 6) * TAU; g.beginPath(); g.moveTo(x + Math.cos(an) * b.r * 1.1, y + Math.sin(an) * b.r * 1.1); g.lineTo(x + Math.cos(an) * b.r * 1.7, y + Math.sin(an) * b.r * 1.7); g.stroke(); }
      return;
    }
    ellipse(g, x, y, b.r * k, b.r * k, 'rgba(255,255,255,.1)', b.col, 1.2);
    ellipse(g, x - b.r * 0.35, y - b.r * 0.35, b.r * 0.22, b.r * 0.22, 'rgba(255,255,255,.95)');
  }
  function lighting(t: number) {
    g.save(); poly(g, scene.clip); g.clip();
    if (!env.lightsOn) { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#6a70b0'; g.fill(); }
    else if (env.sky === 'tarde') { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#ffe6d4'; g.fill(); }
    else if (env.sky === 'noche') { g.globalCompositeOperation = 'multiply'; g.fillStyle = '#e4e6ff'; g.fill(); }
    g.globalCompositeOperation = 'lighter';
    for (const l of scene.lights) {
      let a = env.lightsOn ? l.on : l.off;
      if (a <= 0) continue;
      if (l.flicker && !reduceMotion) a *= 0.88 + Math.sin(t * 9) * 0.06 + ((t % 7.3) < 0.16 ? -0.5 : 0);
      g.save(); g.translate(l.x, l.y); g.scale(1, l.ry / l.rx);
      g.globalAlpha = Math.max(0, a);
      g.fillStyle = rgrad(g, 0, 0, 0, l.rx, [[0, l.color], [1, 'rgba(0,0,0,0)']]);
      g.beginPath(); g.arc(0, 0, l.rx, 0, TAU); g.fill();
      g.restore();
    }
    g.restore();
  }

  /* ---------------- bucle ---------------- */
  let last = performance.now(), running = false;
  const keys = new Set<string>();
  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;

    // Pompa
    const moved = step(pompa, dt);
    if (moved) {
      if (!reduceMotion && Math.random() < dt * 5) { const [sx, sy] = P(pompa.x, pompa.y); bubbleAt(sx - pompa.facing * 10 + Math.random() * 8 - 4, sy - 6, 2 + Math.random() * 3); }
      if (!pompa.path.length) {
        target = null;
        if (pompa.onArrive) { const f = pompa.onArrive; pompa.onArrive = null; f(); }
      }
    } else if (keys.size && panel.hidden && pompa.emote !== 'sit' && document.activeElement !== chatIn) {
      const n = keyStep(keys, Math.floor(pompa.x), Math.floor(pompa.y), free);
      if (n) { pompa.onArrive = null; if (pompa.emote !== 'none') pompa.emote = 'none'; pompa.path = [[n[0] + 0.5, n[1] + 0.5]]; cam.follow = true; }
    } else if (keys.size && pompa.emote === 'sit' && panel.hidden && document.activeElement !== chatIn) standUp();
    if (pompa.emote !== 'none') { pompa.et += dt; if (pompa.et > EMOTE_TIME[pompa.emote]) pompa.emote = 'none'; }

    // Rumbi, a lo suyo
    if (!step(rumbi, dt)) {
      rumbi.wait -= dt;
      if (rumbi.wait <= 0) {
        rumbi.wait = 2 + Math.random() * 5;
        for (let tries = 0; tries < 6; tries++) {
          const tx = 1 + Math.floor(Math.random() * (COLS - 2)), ty = 2 + Math.floor(Math.random() * (ROWS - 2));
          if (!free(tx, ty) || (tx === Math.floor(pompa.x) && ty === Math.floor(pompa.y))) continue;
          const route = findPath(Math.floor(rumbi.x), Math.floor(rumbi.y), tx, ty, free);
          if (route && route.length) { rumbi.path = route; break; }
        }
      }
    } else if (!reduceMotion && Math.random() < dt * 1.6) { const [sx, sy] = P(rumbi.x, rumbi.y); bubbleAt(sx + Math.random() * 20 - 10, sy - 6, 1.5 + Math.random() * 2); }

    // pompas de ambiente
    if (!reduceMotion) {
      const spin = DATA.washers.findIndex((w) => washerStatus(w) === 'available');
      if (spin >= 0 && Math.random() < dt * 1.3) { const [bx, by] = P(1.5 + spin, 0.9, 96); bubbleAt(bx + Math.random() * 30 - 15, by); }
      if (Math.random() < dt * 0.7) { const [bx, by] = P(1 + Math.random() * (COLS - 2), 1 + Math.random() * (ROWS - 2)); bubbleAt(bx, by - 10, 1.5 + Math.random() * 3); }
    }
    for (let i = parts.length - 1; i >= 0; i--) { const b = parts[i]!; b.t += dt; b.y -= b.vy * dt; if (b.t > b.life) parts.splice(i, 1); }

    // la cámara acompaña a Pompa si la sala no cabe
    const b = scene.bg;
    if ((b.w * cam.s > VW || b.h * cam.s > VH - BOTTOM) && !drag && pinch === null && (pompa.path.length || cam.follow)) {
      const [sx, sy] = P(pompa.x, pompa.y, 40);
      const wx = VW / 2 - sx * cam.s, wy = (VH - BOTTOM) / 2 - sy * cam.s, k = reduceMotion ? 1 : Math.min(1, dt * 4);
      cam.x += (wx - cam.x) * k; cam.y += (wy - cam.y) * k; clampCam();
      if (!pompa.path.length && Math.abs(wx - cam.x) < 2 && Math.abs(wy - cam.y) < 2) cam.follow = false;
    }

    computeOrder();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, room.width, room.height);
    g.setTransform(dpr * cam.s, 0, 0, dpr * cam.s, dpr * cam.x, dpr * cam.y);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    put(g, scene.bg);
    if (hoverTile && !hoverItem && !hoverChar) {
      const [x, y] = hoverTile, ok = free(x, y);
      poly(g, zFace(x + 0.04, y + 0.04, x + 0.96, y + 0.96, 0), ok ? 'rgba(255,255,255,.16)' : 'rgba(255,90,90,.16)', ok ? 'rgba(255,255,255,.9)' : 'rgba(255,110,110,.9)', 1.5);
    }
    if (target) { // adónde va
      target.t += dt;
      const [tx, ty] = P(target.x, target.y), k = (target.t * 1.6) % 1;
      g.save(); g.translate(tx, ty); g.scale(1, 0.5);
      g.globalAlpha = 1 - k; g.beginPath(); g.arc(0, 0, 8 + k * 22, 0, TAU); g.strokeStyle = IRI[0]; g.lineWidth = 2.5; g.stroke();
      g.globalAlpha = 0.9; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fillStyle = IRI[1]; g.fill();
      g.restore();
    }
    for (const o of order) { if (o.item) drawItem(o.item, t); else drawWho(o.who!, now, t); }
    parts.forEach(drawBubble);
    lighting(t);

    placeTags();
    placeSays(now);
    if (running) requestAnimationFrame(frame);
  }
  function placeTags() {
    const here = pompa.path.length ? null : scene.items.find((i) => i.act && i.use && i.use[0] === Math.floor(pompa.x) && i.use[1] === Math.floor(pompa.y) && pompa.seat === null);
    scene.items.forEach((it) => {
      const el = tagEls.get(it.id); if (!el) return;
      const [sx, sy] = toScreen(it.spr.x + it.spr.w / 2, it.spr.y + 6);
      el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy - 8)}px) translate(-50%, -100%)`;
      el.classList.toggle('on', hoverItem === it || here === it);
    });
  }
  function placeSays(now: number) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]!;
      if (now > b.until) { b.el.classList.add('fade'); if (now > b.until + 450) { b.el.remove(); bubbles.splice(i, 1); } }
    }
    const stack = new Map<Speaker, number>();
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]!, off = stack.get(b.who) ?? 0;
      const [wx, wy] = P(b.who.x, b.who.y, (b.who.z ?? 0) + b.who.head);
      const [sx, sy] = toScreen(wx, wy);
      const half = b.el.offsetWidth / 2 + 8;
      // quien habla fuera de pantalla no tapa la sala: su bocadillo baja junto a la barra de chat
      const away = sx < -24 || sx > VW + 24 || sy < 0 || sy > VH - BOTTOM + 60;
      const by = away ? VH - BOTTOM - 74 - off : Math.max(b.el.offsetHeight + 8, sy - 6 - off);
      b.el.classList.toggle('away', away);
      b.el.style.transform = `translate(${Math.round(clamp(sx, half, VW - half))}px, ${Math.round(by)}px) translate(-50%, -100%)`;
      stack.set(b.who, off + b.el.offsetHeight + 10);
    }
  }

  /* ---------------- entrada ---------------- */
  type Hit = { item?: Item; who?: 'daniel' | 'rumbi' | 'pompa' };
  function hitTest(wx: number, wy: number, touch: boolean): Hit | null {
    const inBB = (who: 'pompa' | 'daniel' | 'rumbi', pad: number) => { const bb = charBB(who); return wx >= bb[0] - pad && wx < bb[2] + pad && wy >= bb[1] && wy < bb[3]; };
    if (inBB('daniel', -4)) return { who: 'daniel' };
    for (const r of touch ? [0, 9] : [0, 4]) for (let i = order.length - 1; i >= 0; i--) {
      const it = order[i]!.item;
      if (it && it.act && hits(it, wx, wy, r)) return { item: it };
    }
    if (inBB('rumbi', 4)) return { who: 'rumbi' };
    if (inBB('pompa', -6)) return { who: 'pompa' };
    return null;
  }
  const tileAt = (wx: number, wy: number): Tile | null => {
    const [fx, fy] = unproject(wx, wy), x = Math.floor(fx), y = Math.floor(fy);
    return x >= 0 && y >= 0 && x < COLS && y < ROWS ? [x, y] : null;
  };
  const tip = $('#tip');
  let drag: { x: number; y: number; cx: number; cy: number; moved: boolean; id: number } | null = null;
  const touches = new Map<number, [number, number]>();
  let pinch: { d: number; s: number } | null = null;
  stage.addEventListener('pointerdown', (e) => {
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) { const [a, b] = [...touches.values()]; pinch = { d: Math.hypot(a![0] - b![0], a![1] - b![1]), s: cam.s }; drag = null; return; }
    drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, id: e.pointerId };
  });
  stage.addEventListener('pointermove', (e) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && touches.size === 2) {
      const [a, b] = [...touches.values()], d = Math.hypot(a![0] - b![0], a![1] - b![1]);
      zoomAt((a![0] + b![0]) / 2, (a![1] + b![1]) / 2, (pinch.s * d) / pinch.d / cam.s);
      return;
    }
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 7) { drag.moved = true; stage.classList.add('grab'); cam.follow = false; try { stage.setPointerCapture(e.pointerId); } catch { /* da igual */ } }
      if (drag.moved) { cam.x = drag.cx + dx; cam.y = drag.cy + dy; clampCam(); }
      return;
    }
    if (e.pointerType !== 'mouse') return;
    pointer = [e.clientX, e.clientY];
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    const h = hitTest(wx, wy, false);
    hoverItem = h?.item ?? null; hoverChar = h?.who ?? null;
    hoverTile = h ? null : tileAt(wx, wy);
    const text = h ? (h.item ? h.item.label : h.who === 'daniel' ? 'DANIEL · DEPENDIENTE' : h.who === 'rumbi' ? 'RUMBI · FRIEGA EL SUELO' : `${nick} · ERES TÚ`) : null;
    stage.classList.toggle('hand', !!h);
    if (text) { tip.textContent = text; tip.style.display = 'block'; tip.style.left = Math.min(VW - tip.offsetWidth - 8, e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 16) + 'px'; }
    else tip.style.display = 'none';
  });
  stage.addEventListener('pointerleave', () => { hoverTile = null; hoverItem = null; hoverChar = null; pointer = null; tip.style.display = 'none'; });
  const endPointer = (e: PointerEvent) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
  stage.addEventListener('pointerup', (e) => {
    const wasPinch = pinch !== null;
    endPointer(e);
    if (!drag || e.pointerId !== drag.id) return;
    const wasDrag = drag.moved; drag = null; stage.classList.remove('grab');
    if (wasDrag || wasPinch || !panel.hidden) return;
    $('#emotes').hidden = true;
    const [wx, wy] = toWorld(e.clientX, e.clientY);
    const h = hitTest(wx, wy, e.pointerType !== 'mouse');
    cam.follow = true;
    if (h?.item) { target = null; sfx('pop'); return goUse(h.item); }
    if (h?.who === 'daniel') { const c = scene.items.find((i) => i.id === 'counter'); return c ? goUse(c) : talkDaniel(); }
    if (h?.who === 'rumbi') { rumbi.happyUntil = performance.now() + 1800; sfx('bip'); return say(WHO.rumbi, pick(['bip bip', 'bzzz ♥', 'bip. suelo limpio.']), 2200); }
    if (h?.who === 'pompa') return emote('wave');
    const tl = tileAt(wx, wy);
    if (tl && free(tl[0], tl[1]) && walkTo(tl[0], tl[1])) { target = { x: tl[0] + 0.5, y: tl[1] + 0.5, t: 0 }; sfx('step'); }
  });
  stage.addEventListener('pointercancel', (e) => { endPointer(e); drag = null; stage.classList.remove('grab'); });
  stage.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016))); }, { passive: false });
  addEventListener('resize', () => resize(false));

  const chatIn = $<HTMLInputElement>('#chatIn');
  const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  function interact() {
    const tx = Math.floor(pompa.x), ty = Math.floor(pompa.y);
    const near = scene.items.filter((i) => i.act && i.use).map((i) => ({ i, d: Math.hypot(i.use![0] - tx, i.use![1] - ty) })).filter((o) => o.d <= 1.5).sort((a, b) => a.d - b.d)[0];
    if (near) goUse(near.i); else if (Math.hypot(daniel.x - pompa.x, daniel.y + 1.5 - pompa.y) < 2.5) talkDaniel();
  }
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (!panel.hidden) closePanel(); else $('#emotes').hidden = true; return; }
    if (!running || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey || !panel.hidden) return;
    const k = e.key.toLowerCase();
    if (isMoveKey(k)) { keys.add(k); e.preventDefault(); return; }
    if (k === 'e' || k === 'enter') { if (e.target instanceof HTMLElement && e.target !== stage && e.target !== document.body && k === 'enter') return; e.preventDefault(); return interact(); }
    if (k === '1') return emote('wave');
    if (k === '2') return emote('jump');
    if (k === '3') return emote('dance');
    if (k === '4') return emote('cheer');
    if (k === '+' || k === '=') return zoomAt(VW / 2, (VH - BOTTOM) / 2, 1.2);
    if (k === '-') return zoomAt(VW / 2, (VH - BOTTOM) / 2, 1 / 1.2);
    if (k === 't' || k === '/') { e.preventDefault(); chatIn.focus({ preventScroll: true }); }
  });
  addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  addEventListener('blur', () => keys.clear());

  /* ---------------- Daniel ---------------- */
  function talkDaniel() {
    daniel.waveUntil = performance.now() + 1500;
    say(WHO.daniel, pick(['¡Buenas! ¿Te ayudo con tallas, drops o envíos?', 'Unidades limitadas. Agotado es agotado.', 'Cada pieza sale de un arte. Mira la pared de ARTES.', '¿Te recomiendo algo? Pídemelo.']));
    if (!coarse) setTimeout(() => chatIn.focus({ preventScroll: true }), 60);
  }
  function ask(q: string) {
    say(WHO.pompa, q, 3600);
    const r = danielReply(q, DATA);
    setTimeout(() => {
      daniel.waveUntil = performance.now() + 900;
      say(WHO.daniel, r.text, 7500);
      if (r.show) setTimeout(() => { if (panel.hidden && item(r.show!)) openPiece(r.show!); }, 1700);
    }, 520);
  }
  $('#chat').addEventListener('submit', (e) => { e.preventDefault(); const q = chatIn.value.trim(); if (!q) return; chatIn.value = ''; ask(q); });
  $('#quick').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLElement>('[data-say]'); if (b) ask(b.dataset.say!); });

  /* ---------------- paneles ---------------- */
  const panel = $('#panel'), pBody = $('#pBody'), pTitle = $('#pTitle');
  let lastFocus: Element | null = null;
  let countTimer = 0, mirrorRaf = 0;
  function openPanel(title: string, html: string) {
    if (panel.hidden) lastFocus = document.activeElement;
    clearInterval(countTimer); cancelAnimationFrame(mirrorRaf);
    pTitle.textContent = title; pBody.innerHTML = html; panel.hidden = false;
    pBody.scrollTop = 0; keys.clear();
    $('#emotes').hidden = true;
    panel.querySelector<HTMLElement>('header button')?.focus({ preventScroll: true });
    sfx('open');
  }
  function closePanel() {
    panel.hidden = true; trial = null; clearInterval(countTimer); cancelAnimationFrame(mirrorRaf);
    pompa.hiddenUntil = 0;
    if (lastFocus instanceof HTMLElement) lastFocus.focus({ preventScroll: true });
  }
  panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });
  // el foco no sale del diálogo
  panel.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = [...panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input')].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0]!, lastEl = f[f.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
  let toastT = 0;
  function toast(msg: string) { const el = $('#toast'); el.textContent = msg; el.classList.add('on'); clearTimeout(toastT); toastT = window.setTimeout(() => el.classList.remove('on'), 2800); }

  const stockTag = (i: RoomItem) => {
    const out = i.stockLabel === 'AGOTADO', low = /SOLO QUEDAN/.test(i.stockLabel);
    return !i.purchasable && !out ? '<span class="tag low">PRONTO</span>' : out ? '<span class="tag out">AGOTADO</span>' : low ? '<span class="tag low">ÚLTIMAS</span>' : '';
  };
  const cardHTML = (i: RoomItem) => `<a class="card" href="${i.href}" data-piece="${esc(i.slug)}"><div class="img">${stockTag(i)}<img src="${pieceURL(i.slug, i)}" alt=""></div>
    <div class="meta"><strong>${esc(i.name)}</strong>${euro(i.priceCents)}</div></a>`;
  const CATS: Record<string, [string, (i: RoomItem) => boolean]> = {
    print: ['LÁMINAS', (i) => i.sprite === 'print'],
    textil: ['TELAS Y PAÑUELOS', (i) => i.sprite === 'fabric' || i.sprite === 'scarf'],
    ropa: ['ROPA', (i) => i.sprite === 'hoodie' || i.sprite === 'tee' || i.sprite === 'beanie'],
  };
  function openCatalog(cat = '') {
    const f = CATS[cat];
    const list = f ? DATA.items.filter(f[1]) : DATA.items;
    const groups = DATA.washers.map((d) => {
      const its = list.filter((i) => i.dropNumber === d.number);
      return its.length ? `<div class="eyebrow">LAVADORA ${d.number} · ${esc(d.name)} · ${PHASE_LABEL[d.phase] ?? ''}</div><div class="grid">${its.map(cardHTML).join('')}</div>` : '';
    }).join('');
    const filters = `<div class="filters">${[['', 'TODO'], ['ropa', 'ROPA'], ['print', 'LÁMINAS'], ['textil', 'TELAS']].map(([k, l]) => `<button class="ch ${k === cat ? 'on' : ''}" data-act="catalog" data-v="${k}">${l}</button>`).join('')}</div>`;
    openPanel(f ? f[0] : 'PRODUCTOS', filters + (groups || '<p>Todavía no hay piezas aquí.</p>'));
  }

  /** Ficha rápida: ver la pieza, elegir talla y meterla en la bolsa sin salir de la sala. */
  let chosen: string | null = null;
  function openPiece(slug: string) {
    const i = item(slug);
    if (!i) return openCatalog();
    const live = i.variants.filter((v) => v.available > 0);
    if (!live.some((v) => v.id === chosen)) chosen = live.length === 1 ? live[0]!.id : null;
    const v = i.variants.find((x) => x.id === chosen);
    const price = v ? v.priceCents : i.priceCents;
    const many = new Set(i.variants.map((x) => x.priceCents)).size > 1;
    const sizes = i.variants.length > 1 || (i.variants[0] && i.variants[0].label)
      ? `<div class="eyebrow">${i.variants.length > 1 ? 'ELIGE' : 'MEDIDA'}</div><div class="sizes" role="group" aria-label="Variantes">${i.variants.map((x) => `<button class="sz ${x.id === chosen ? 'on' : ''}" data-act="variant" data-slug="${esc(i.slug)}" data-v="${x.id}" ${x.available < 1 ? 'disabled' : ''} aria-pressed="${x.id === chosen}">${esc(x.label || 'ÚNICA')}</button>`).join('')}</div>` : '';
    const state = i.stockLabel === 'AGOTADO' ? 'out' : /SOLO/.test(i.stockLabel) ? 'low' : '';
    const stock = !i.purchasable && i.stockLabel !== 'AGOTADO' ? `SE ABRE CON LA LAVADORA ${i.dropNumber}` : v ? (v.available <= 3 ? `SOLO QUEDAN ${v.available}` : 'EN STOCK') : i.stockLabel;
    const buy = i.purchasable
      ? `<button class="pbtn" data-act="add" data-slug="${esc(i.slug)}" ${chosen ? '' : 'disabled'}>${chosen ? 'AÑADIR A LA BOLSA' : 'ELIGE UNA OPCIÓN'}</button>`
      : `<button class="pbtn" disabled>${i.stockLabel === 'AGOTADO' ? 'AGOTADO' : 'TODAVÍA NO'}</button>`;
    openPanel(i.support.toUpperCase(), `<div class="prod">
      <div class="hang">${stockTag(i)}<img src="${pieceURL(i.slug, i, 480)}" alt="${esc(i.name)}"></div>
      <div>
        <div class="eyebrow">LAVADORA ${i.dropNumber} · ${PHASE_LABEL[i.phase] ?? ''}</div>
        <h3 class="big">${esc(i.name)}</h3>
        <div class="price">${many && !v ? 'desde ' : ''}${euro(price)}</div>
        <p>${esc(i.blurb)}</p>
        <p class="from">Sale del arte <button class="lnk" data-act="art" data-v="${esc(i.artSlug)}">${esc(i.artName)}</button>.</p>
        ${sizes}
        <div class="stock ${state}" id="stockMsg">${esc(stock)}</div>
        <div class="row">${buy}${i.wear ? `<button class="pbtn ghost" data-act="try" data-slug="${esc(i.slug)}">PROBÁRSELO A POMPA</button>` : ''}</div>
        <p class="more"><a class="lnk" href="${i.href}">Ver la ficha completa →</a></p>
      </div></div>`);
  }
  async function addToBag(slug: string) {
    const i = item(slug);
    if (!i || !chosen) return;
    const msg = $('#stockMsg');
    try {
      const r = await fetch('/api/bolsa', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ variantId: chosen }) });
      const j = (await r.json()) as { ok: boolean; count?: number; reason?: string };
      if (j.ok) {
        refreshBag(); sfx('ding'); emote('cheer');
        toast(`${i.name.toUpperCase()} · EN LA BOLSA`);
        pBody.querySelector('.row')?.insertAdjacentHTML('afterend', '<p class="done">Ya está en tu bolsa. <a class="lnk" href="/bolsa">Ir a la bolsa →</a></p>');
        pBody.querySelector('.done ~ .done')?.remove();
      } else {
        sfx('no');
        if (msg) { msg.className = 'stock out'; msg.textContent = j.reason === 'agotado' ? 'SE ACABA DE AGOTAR' : j.reason === 'max_quantity' ? 'YA LLEVAS EL MÁXIMO DE ESTA' : j.reason === 'full' ? 'LA BOLSA ESTÁ LLENA' : 'NO SE PUDO AÑADIR'; }
      }
    } catch { sfx('no'); if (msg) { msg.className = 'stock out'; msg.textContent = 'SIN CONEXIÓN · INTÉNTALO OTRA VEZ'; } }
  }

  function openDrop(slug: string) {
    const d = DATA.washers.find((x) => x.slug === slug);
    if (!d) return;
    const st = washerStatus(d);
    if (st === 'locked') return openKey(d);
    const its = DATA.items.filter((i) => i.dropNumber === d.number);
    const head = `<div class="eyebrow">DROP ${d.number} · ${PHASE_LABEL[d.phase] ?? ''}</div><h3 class="big">${esc(d.name)}</h3><p>${esc(d.copy)}</p>`;
    const more = `<p class="more"><a class="pbtn" href="${d.href}">VER EL DROP →</a></p>`;
    const grid = `<div class="grid">${its.map(cardHTML).join('')}</div>`;
    if (st === 'coming') {
      openPanel(`LAVADORA ${d.number}`, head + `<div class="eyebrow">SE ABRE EL ${esc(opensLabel(d.opensAt).toUpperCase())}</div><div class="count" id="count"></div>` + grid + more);
      const tick = () => {
        const el = pBody.querySelector('#count'); if (!el) return clearInterval(countTimer);
        const s = Math.max(0, Math.floor((new Date(d.opensAt ?? Date.now()).getTime() - Date.now()) / 1000));
        el.innerHTML = [[Math.floor(s / 86400), 'DÍAS'], [Math.floor(s / 3600) % 24, 'HORAS'], [Math.floor(s / 60) % 60, 'MIN'], [s % 60, 'SEG']].map(([n, l]) => `<div><b>${String(n).padStart(2, '0')}</b><span>${l}</span></div>`).join('');
      };
      tick(); countTimer = window.setInterval(tick, 1000);
      return;
    }
    openPanel(`LAVADORA ${d.number}`, head + grid + more);
  }
  function openKey(d?: RoomWasher) {
    d = d ?? DATA.washers.find((x) => washerStatus(x) === 'locked');
    if (!d) return openPanel('TU LLAVE', '<p>Ahora mismo no hay ninguna lavadora con candado.</p>');
    openPanel('TU LLAVE', `<div class="eyebrow">LAVADORA ${d.number} · CERRADA</div><h3 class="big">${esc(d.name)}</h3>
      <p>${esc(d.copy)}</p>
      <form class="field" data-form="key"><input id="keyIn" placeholder="XXXXX-0000" aria-label="Tu llave" autocomplete="off"><button class="pbtn">ABRIR</button></form>
      <div class="stock" id="keyMsg"></div><p class="more"><a class="pbtn ghost" href="${d.href}">VER EL DROP →</a></p>`);
  }

  /* --- vestidor --- */
  let trial: Outfit | null = null;
  let turn: 1 | -1 = 1, turned = false;
  const wearOptions = (slot: 'top' | 'head') => DATA.items.filter((i) => i.wear && i.wear.slot === slot);
  function setWear(o: Outfit, slot: 'top' | 'head', slug: string) {
    const i = slug === 'none' ? undefined : item(slug);
    if (slot === 'top') {
      if (!i || !i.wear) { o.top = 'none'; o.topSlug = null; o.topColor = null; o.topPattern = null; }
      else { o.top = i.wear.kind === 'hoodie' ? 'hoodie' : 'tee'; o.topSlug = i.slug; o.topColor = i.color; o.topPattern = i.pattern; }
    } else if (!i || !i.wear) { o.head = 'none'; o.headSlug = null; o.headColor = null; o.headPattern = null; }
    else { o.head = i.wear.kind === 'cap' ? 'cap' : 'beanie'; o.headSlug = i.slug; o.headColor = i.color; o.headPattern = i.pattern; }
  }
  /** Lo guardado puede ser de otro catálogo: se rehace con las piezas de hoy. */
  function reviveOutfit() {
    if (!SKINS[outfit.skin] || (SKINS[outfit.skin]!.locked && socks.length < SOCK_SPOTS.length)) outfit.skin = 'iris';
    setWear(outfit, 'top', outfit.topSlug ?? 'none'); setWear(outfit, 'head', outfit.headSlug ?? 'none');
    if (!FACES[outfit.face]) outfit.face = 'none';
    if (!MOODS[outfit.mood]) outfit.mood = 'feliz';
  }
  function openWardrobe() {
    trial = trial ?? { ...outfit };
    const tr = trial;
    const opts = (slot: 'top' | 'head') => {
      const cur = (slot === 'top' ? tr.topSlug : tr.headSlug) ?? 'none';
      return [`<button class="ch ${cur === 'none' ? 'on' : ''}" data-act="wear" data-slot="${slot}" data-v="none">Nada</button>`]
        .concat(wearOptions(slot).map((i) => `<button class="ch pc ${cur === i.slug ? 'on' : ''}" data-act="wear" data-slot="${slot}" data-v="${esc(i.slug)}"><img src="${pieceURL(i.slug, i, 96)}" alt="">${esc(i.name)}</button>`)).join('');
    };
    const worn = [tr.topSlug, tr.headSlug].map((s) => (s ? item(s) : undefined)).filter((x): x is RoomItem => !!x);
    const links = worn.map((x) => `<button class="pbtn ghost" data-act="piece" data-v="${esc(x.slug)}">${esc(x.name)} · ${euro(x.priceCents)}</button>`).join('');
    const gold = socks.length >= SOCK_SPOTS.length;
    openPanel('VESTIDOR DE POMPA', `<div class="wardrobe">
      <div class="mirror"><canvas id="mirror" width="300" height="360" role="img" aria-label="Pompa con el look que estás probando"></canvas>
        <button class="ch" data-act="turn">GIRAR</button></div>
      <div>
        <div class="opt"><div class="eyebrow">PIEL</div><div class="row">${Object.entries(SKINS).map(([k, s]) => (s.locked && !gold
          ? `<button class="sw lock" disabled title="Encuentra los ${SOCK_SPOTS.length} calcetines perdidos" aria-label="${s.name}: bloqueada. Encuentra los ${SOCK_SPOTS.length} calcetines perdidos">?</button>`
          : `<button class="sw ${tr.skin === k ? 'on' : ''}" style="background:radial-gradient(circle at 35% 30%, #fff, ${s.base} 45%, ${s.dark})" data-act="wear" data-slot="skin" data-v="${k}" aria-label="${s.name}" title="${s.name}" aria-pressed="${tr.skin === k}"></button>`)).join('')}</div></div>
        <div class="opt"><div class="eyebrow">ARRIBA</div><div class="row">${opts('top')}</div></div>
        <div class="opt"><div class="eyebrow">CABEZA</div><div class="row">${opts('head')}</div></div>
        <div class="opt"><div class="eyebrow">CARA</div><div class="row">${Object.entries(FACES).map(([k, v]) => `<button class="ch ${tr.face === k ? 'on' : ''}" data-act="wear" data-slot="face" data-v="${k}">${v}</button>`).join('')}</div></div>
        <div class="opt"><div class="eyebrow">GESTO</div><div class="row">${Object.entries(MOODS).map(([k, v]) => `<button class="ch ${tr.mood === k ? 'on' : ''}" data-act="wear" data-slot="mood" data-v="${k}">${v}</button>`).join('')}</div></div>
        <div class="row"><button class="pbtn" data-act="save-look">GUARDAR LOOK</button><button class="pbtn ghost" data-act="random-look">ALEATORIO</button></div>
        ${links ? `<div class="opt worn"><div class="eyebrow">LO QUE LLEVA, EN LA TIENDA</div><div class="row">${links}</div></div>` : ''}
      </div></div>`);
    const mc = $<HTMLCanvasElement>('#mirror'), mg = mc.getContext('2d')!;
    const p: Pose = { ...POSE };
    const drawMirror = (now: number) => {
      if (!mc.isConnected || !trial) return;
      mg.setTransform(1, 0, 0, 1, 0, 0); mg.clearRect(0, 0, mc.width, mc.height);
      mg.setTransform(3, 0, 0, 3, mc.width / 2, mc.height - 36);
      drawShadow(mg, 19);
      p.t = reduceMotion ? 0 : now / 1000; p.facing = turn; p.back = turned;
      drawPompa(mg, trial, p);
      if (!reduceMotion) mirrorRaf = requestAnimationFrame(drawMirror);
    };
    drawMirror(performance.now());
  }
  function openLook() {
    const top = DATA.items.find((i) => i.purchasable && i.wear?.slot === 'top') ?? DATA.items.find((i) => i.wear?.slot === 'top');
    const head = DATA.items.find((i) => i.wear?.slot === 'head');
    const list = [top, head].filter((x): x is RoomItem => !!x);
    openPanel('EL LOOK DEL MANIQUÍ', `<p>Lo que lleva puesto el maniquí esta semana.</p><div class="grid">${list.map(cardHTML).join('')}</div>
      <div class="row more"><button class="pbtn" data-act="wear-look">PONÉRSELO A POMPA</button></div>`);
  }

  /* --- artes --- */
  function openArtworks() {
    const kinds: [string, string][] = [['patron', 'PATRONES DE ESTAMPADO'], ['textura', 'TEXTURAS'], ['textil', 'TEXTILES']];
    openPanel('ARTES', kinds.map(([k, l]) => {
      const list = DATA.artworks.filter((a) => a.kind === k);
      return list.length ? `<div class="eyebrow">${l}</div><div class="arch">${list.map((a) => `<a class="polaroid" href="${a.href}" data-art="${esc(a.slug)}"><i style="background-image:url(${swatchURL(a.pattern)})"></i><b>${esc(a.kindLabel.toUpperCase())}</b><span>${esc(a.name)}</span></a>`).join('')}</div>` : '';
    }).join('') + `<p class="more"><a class="pbtn" href="/artes">VER TODAS LAS ARTES →</a></p>`);
  }
  function openArt(slug: string) {
    const a: RoomArtwork | undefined = DATA.artworks.find((x) => x.slug === slug);
    if (!a) return openArtworks();
    const made = DATA.items.filter((i) => i.artSlug === slug);
    openPanel(a.kindLabel.toUpperCase(), `<div class="prod">
      <div class="hang art"><i style="background-image:url(${swatchURL(a.pattern, 480)})"></i></div>
      <div><div class="eyebrow">ARTE</div><h3 class="big">${esc(a.name)}</h3><p>${esc(a.story)}</p>
        <div class="row"><a class="pbtn" href="${a.href}">VER EL ARTE →</a><button class="pbtn ghost" data-act="artworks">TODAS</button></div></div></div>
      ${made.length ? `<div class="eyebrow more">PIEZAS CON ESTE ARTE</div><div class="grid">${made.map(cardHTML).join('')}</div>` : ''}`);
  }

  const PAGES: Record<string, [string, string]> = {
    story: ['HISTORIA', `<div class="eyebrow">${BRAND} — EST. 2026</div><h3 class="big">UNA LAVANDERÍA DE IDEAS</h3>
      <p>Dani R. diseña patrones de estampado, texturas y textiles, y los convierte en prendas, láminas y tela por metro.</p>
      <p>Aquí cada lavadora es un drop. Unas giran, otras esperan y alguna solo se abre con llave. La ropa sale limpia; las ideas, no.</p>
      <p>Pompa es quien te representa dentro. Vístela en el vestidor y habla con Daniel en el mostrador.</p>`],
    contact: ['CONTACTO', `<p>Para colaboraciones, prensa o dudas con un pedido.</p><p><strong>Email y redes:</strong> pendientes de confirmar.</p>`],
    shipping: ['ENVÍOS', `<p>Península: 48–72 h, 4,90 € (gratis desde 100 €). Baleares: 7,90 €.</p><p><a class="pbtn" href="/legal/envios">ENVÍOS →</a></p>`],
    returns: ['DEVOLUCIONES', `<p>14 días para desistir. La tela cortada a medida no admite devolución.</p><p><a class="pbtn" href="/legal/devoluciones">DEVOLUCIONES →</a></p>`],
    help: ['CÓMO SE USA', `<ul class="keys">
      <li><b>MOVERTE</b>Toca el suelo, o usa las flechas o WASD.</li>
      <li><b>USAR</b>Toca un mueble, o acércate y pulsa E.</li>
      <li><b>CÁMARA</b>Arrastra para mover; rueda, pellizco o + y − para el zoom.</li>
      <li><b>GESTOS</b>Teclas 1 a 4, o el botón de la carita.</li>
      <li><b>HABLAR</b>Escribe a Daniel abajo (tecla T).</li>
    </ul><p class="note">Todo lo que hay en la sala está también en los botones y en las páginas normales de la tienda.</p>`],
  };
  function openSocks() {
    const n = socks.length, all = n >= SOCK_SPOTS.length;
    openPanel('CALCETINES PERDIDOS', `<div class="eyebrow">${n} DE ${SOCK_SPOTS.length}</div><h3 class="big">${all ? 'LOS TIENES TODOS' : 'LAS LAVADORAS SE LOS COMEN'}</h3>
      <p>${all ? 'Has encontrado los cinco. La piel «Calcetín de oro» te espera en el vestidor.' : 'Hay cinco calcetines sueltos por la lavandería: encima de algún mueble, por el suelo… Tócalos para recogerlos. Quien los encuentra todos se lleva una piel especial para Pompa.'}</p>
      <div class="sockrow">${SOCK_SPOTS.map((s, i) => `<span class="${socks.includes(i) ? 'got' : ''}" style="color:${s.col}">${icon('sock')}</span>`).join('')}</div>
      ${all ? '<div class="row"><button class="pbtn" data-act="wardrobe">IR AL VESTIDOR</button></div>' : ''}`);
  }
  function openLogin() {
    openPanel('TU NOMBRE', `<p>Las cuentas llegan más adelante. Por ahora eres invitado, pero puedes ponerte nombre para hablar en la lavandería.</p>
      <form class="field" data-form="nick"><input id="nickIn" maxlength="12" value="${esc(nick)}" aria-label="Tu nombre"><button class="pbtn">GUARDAR</button></form>`);
  }
  function refreshChip() {
    const c = $<HTMLCanvasElement>('#chipAv'), cg = c.getContext('2d')!;
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, c.width, c.height);
    cg.setTransform(1.15, 0, 0, 1.15, c.width / 2 - 2, c.height + 38);
    drawPompa(cg, outfit, POSE);
    $('#nick').textContent = nick;
  }

  /* ---------------- botones ---------------- */
  function act(el: HTMLElement) {
    const a = el.dataset.act, d = el.dataset;
    switch (a) {
      case 'close': return closePanel();
      case 'home': closePanel(); cam.s = clamp(cam.fit, 0.62, 1.7); centerOn(...P(5.2, 4.2, 60)); cam.follow = false; return emote('wave');
      case 'zoom-in': return zoomAt(VW / 2, (VH - BOTTOM) / 2, 1.25);
      case 'zoom-out': return zoomAt(VW / 2, (VH - BOTTOM) / 2, 1 / 1.25);
      case 'catalog': return openCatalog(d.v ?? '');
      case 'drops': return openPanel('DROPS', `<div class="grid">${DATA.washers.map((x) => { const st = washerStatus(x); return `<a class="card" href="${x.href}"><div class="img wash">${`<span class="tag ${st === 'available' ? '' : st === 'coming' ? 'low' : 'out'}">${PHASE_LABEL[x.phase] ?? ''}</span>`}${icon('washer')}</div><div class="meta"><strong>${x.number} · ${esc(x.name)}</strong>Lavadora ${x.number}</div></a>`; }).join('')}</div>`);
      case 'key': return openKey();
      case 'wardrobe': return openWardrobe();
      case 'wear': {
        if (!trial) return;
        if (d.slot === 'skin' || d.slot === 'face' || d.slot === 'mood') trial[d.slot] = d.v!;
        else setWear(trial, d.slot === 'head' ? 'head' : 'top', d.v!);
        return openWardrobe();
      }
      case 'turn': if (turn === 1 && !turned) turn = -1; else if (turn === -1 && !turned) turned = true; else if (turned && turn === -1) turn = 1; else { turned = false; turn = 1; } return;
      case 'random-look': {
        const gold = socks.length >= SOCK_SPOTS.length;
        const skins = Object.keys(SKINS).filter((k) => gold || !SKINS[k]!.locked);
        trial = { ...outfit, skin: pick(skins), face: pick(Object.keys(FACES)), mood: pick(Object.keys(MOODS)) };
        setWear(trial, 'top', pick(['none', ...wearOptions('top').map((i) => i.slug)]));
        setWear(trial, 'head', pick(['none', ...wearOptions('head').map((i) => i.slug)]));
        return openWardrobe();
      }
      case 'save-look':
        if (trial) Object.assign(outfit, trial);
        trial = null; store.set('outfit3', outfit); refreshChip(); closePanel(); burst(pompa.x, pompa.y, 40, 12); emote('cheer');
        return say(WHO.pompa, 'Así salgo del vestidor.');
      case 'wear-look': {
        const top = DATA.items.find((i) => i.purchasable && i.wear?.slot === 'top') ?? DATA.items.find((i) => i.wear?.slot === 'top');
        const head = DATA.items.find((i) => i.wear?.slot === 'head');
        if (top) setWear(outfit, 'top', top.slug);
        if (head) setWear(outfit, 'head', head.slug);
        store.set('outfit3', outfit); refreshChip(); closePanel(); burst(pompa.x, pompa.y, 40, 12); emote('cheer');
        return say(WHO.pompa, 'Me queda mejor que al maniquí.');
      }
      case 'try': {
        const i = item(d.slug ?? ''); if (!i || !i.wear) return;
        setWear(outfit, i.wear.slot, i.slug); store.set('outfit3', outfit); refreshChip(); closePanel(); burst(pompa.x, pompa.y, 40, 12); emote('cheer');
        return say(WHO.pompa, `Me pruebo ${i.name}.`);
      }
      case 'piece': return openPiece(d.v ?? '');
      case 'variant': chosen = d.v ?? null; return openPiece(d.slug ?? '');
      case 'add': return void addToBag(d.slug ?? '');
      case 'art': return openArt(d.v ?? '');
      case 'artworks': return openArtworks();
      case 'login': return openLogin();
      case 'socks': return openSocks();
      case 'lights': return toggleLights();
      case 'emotes': { const m = $('#emotes'); m.hidden = !m.hidden; el.setAttribute('aria-expanded', String(!m.hidden)); return; }
      case 'emote': $('#emotes').hidden = true; return emote(d.v as Emote);
      case 'sound': {
        soundOn = !soundOn; const b = $('#soundBtn'); b.innerHTML = icon(soundOn ? 'sound' : 'mute'); b.setAttribute('aria-pressed', String(soundOn)); b.setAttribute('aria-label', soundOn ? 'Quitar el sonido' : 'Activar el sonido');
        if (soundOn) sfx('ding'); return;
      }
      default: if (a && PAGES[a]) return openPanel(...PAGES[a]!);
    }
  }
  ROOT.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    // dentro de la sala, las tarjetas abren la ficha rápida; el enlace sigue ahí para abrir en otra pestaña
    const card = t.closest<HTMLElement>('a[data-piece], a[data-art]');
    if (card && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
      e.preventDefault();
      return card.dataset.piece ? openPiece(card.dataset.piece) : openArt(card.dataset.art!);
    }
    const el = t.closest<HTMLElement>('[data-act]');
    if (el) { e.preventDefault(); act(el); }
  });
  pBody.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = (e.target as HTMLElement).dataset.form;
    if (f === 'key') { const m = $('#keyMsg'); m.className = 'stock out'; m.textContent = 'ESA LLAVE NO ABRE NADA AQUÍ'; sfx('no'); }
    if (f === 'nick') { nick = ($<HTMLInputElement>('#nickIn').value.trim() || 'INVITADO').toUpperCase().slice(0, 12); store.set('nick', nick); refreshChip(); closePanel(); say(WHO.pompa, 'Ahora me llamo ' + nick + '.'); }
  });

  /* ---------------- bolsa ---------------- */
  function refreshBag() { const n = bagCount(document.cookie); $('#bagN').textContent = n ? String(n) : ''; }
  document.addEventListener('visibilitychange', refreshBag);

  /* ---------------- portada ---------------- */
  let introRaf = 0;
  function introLoop(now: number) {
    const c = ROOT.querySelector<HTMLCanvasElement>('#introPompa'); if (!c) return;
    const cg = c.getContext('2d')!;
    cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, c.width, c.height);
    cg.setTransform(2.3, 0, 0, 2.3, c.width / 2, c.height - 26);
    drawShadow(cg, 19);
    drawPompa(cg, outfit, { ...POSE, t: reduceMotion ? 0 : now / 1000, emote: reduceMotion ? 'none' : 'wave', et: now / 1000 });
    if (!reduceMotion) introRaf = requestAnimationFrame(introLoop);
  }
  function start() {
    cancelAnimationFrame(introRaf);
    const intro = $('#intro');
    intro.classList.add('out');
    setTimeout(() => intro.remove(), 600);
    cam.follow = true;
    walkTo(2, 7, () => { emote('wave'); say(WHO.pompa, '¿Hola?'); });
    setTimeout(() => { daniel.waveUntil = performance.now() + 1800; say(WHO.daniel, 'Bienvenido a la lavandería. Toca el suelo para moverte y los muebles para usarlos.', 7500); }, 900);
    stage.focus({ preventScroll: true });
  }

  /* ---------------- arranque ---------------- */
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  refreshBag(); refreshSocks(); refreshLightBtn();
  const fonts: Promise<unknown> = document.fonts
    ? Promise.race([Promise.all([document.fonts.load('700 20px "Familjen Grotesk"'), document.fonts.load('700 10px Silkscreen'), document.fonts.load('400 10px Silkscreen')]), new Promise((r) => setTimeout(r, 2500))])
    : Promise.resolve();
  const enter = $<HTMLButtonElement>('#enter');
  Promise.all([fetch('/api/room').then((r) => { if (!r.ok) throw new Error('room'); return r.json() as Promise<RoomData>; }), fonts.catch(() => null)]).then(([data]) => {
    DATA = data;
    reviveOutfit();
    resize(false);
    rebuild();
    pompa.x = scene.spawn[0]; pompa.y = scene.spawn[1];
    resize(true);
    refreshChip(); introLoop(performance.now());
    running = true; last = performance.now();
    requestAnimationFrame(frame);
    enter.disabled = false; enter.textContent = 'ENTRAR';
    enter.addEventListener('click', start, { once: true });
    (window as unknown as { __sbx: unknown }).__sbx = {
      pompa, daniel, rumbi, walkTo, outfit, openPanel, act, run, cam, P, socks, env,
      get ITEMS() { return scene.items; }, get scene() { return scene; }, get DATA() { return DATA; },
      toScreen: (x: number, y: number, z = 0) => toScreen(...P(x, y, z)),
    };
  }).catch(() => { enter.textContent = 'NO SE PUDO CARGAR'; document.body.style.overflow = prevOverflow; });
}
