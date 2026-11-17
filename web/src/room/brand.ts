/*
 * Recursos de marca dibujados en la sala (originales en el Drive de Daniel, ver docs/LAVANDERIA.md).
 * Los archivos de public/marca son siluetas: solo importa su transparencia. El color lo pone la escena,
 * así que cambiar la paleta no obliga a volver a exportar nada.
 */
import { canvas, type G } from './core';

export type BrandArt = { w: number; h: number; tint: (color: string) => HTMLCanvasElement };
/** `null` si no cargó: la escena dibuja entonces lo de siempre (HOLA y SBX). */
export type Brand = { alfombrilla: BrandArt | null; logotipo: BrandArt | null };

export const BRAND_SRC = { alfombrilla: '/marca/alfombrilla.webp', logotipo: '/marca/logotipo.webp' } as const;

function load(src: string): Promise<BrandArt | null> {
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  return img.decode().then(() => {
    const cache = new Map<string, HTMLCanvasElement>();
    return {
      w: img.naturalWidth, h: img.naturalHeight,
      tint(color: string) {
        let c = cache.get(color);
        if (!c) {
          const [cv, g] = canvas(img.naturalWidth, img.naturalHeight);
          g.drawImage(img, 0, 0);
          g.globalCompositeOperation = 'source-in';
          g.fillStyle = color; g.fillRect(0, 0, cv.width, cv.height);
          cache.set(color, (c = cv));
        }
        return c;
      },
    };
  }, () => null);
}

/** Nunca falla: lo que no carga queda en `null`. */
export function loadBrand(): Promise<Brand> {
  return Promise.all([load(BRAND_SRC.alfombrilla), load(BRAND_SRC.logotipo)]).then(([alfombrilla, logotipo]) => ({ alfombrilla, logotipo }));
}

/** Pinta la silueta de color `color`, centrada en (cx, cy) y encajada en una caja de maxW × maxH. */
export function drawBrand(g: G, art: BrandArt, color: string, cx: number, cy: number, maxW: number, maxH: number) {
  const k = Math.min(maxW / art.w, maxH / art.h), w = art.w * k, h = art.h * k;
  g.drawImage(art.tint(color), cx - w / 2, cy - h / 2, w, h);
}
