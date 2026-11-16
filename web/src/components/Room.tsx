'use client';
import { useEffect, useRef } from 'react';
import '@/room/room.css';

/* La lavandería: se monta en el navegador sobre este <div> (src/room/main.ts). */
export function Room() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    void import('@/room/main').then((m) => { if (alive && ref.current) m.mount(ref.current); });
    return () => { alive = false; };
  }, []);
  return <div id="lavanderia" ref={ref} aria-label="Lavandería SOAPBRXND" />;
}
