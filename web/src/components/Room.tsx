'use client';
import { useEffect, useRef } from 'react';
import '@/room/room.css';

/* La lavandería: se monta en el navegador sobre este <div> (src/room/main.ts) y se desmonta al salir de la portada. */
export function Room() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    let destroy: (() => void) | null = null;
    void import('@/room/main').then((m) => { if (alive && ref.current) destroy = m.mount(ref.current); });
    return () => { alive = false; destroy?.(); };
  }, []);
  return <div id="lavanderia" ref={ref} aria-label="Lavandería SOAPBRXND" />;
}
