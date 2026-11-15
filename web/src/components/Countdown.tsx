'use client';
import { useEffect, useState } from 'react';

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (now === null) return null;
  const s = Math.max(0, Math.floor((Date.parse(to) - now) / 1000));
  const parts: [number, string][] = [[Math.floor(s / 86400), 'días'], [Math.floor(s / 3600) % 24, 'horas'], [Math.floor(s / 60) % 60, 'min'], [s % 60, 'seg']];
  return (
    <div className="tk-count" role="timer" aria-label="Tiempo hasta que se abre">
      {parts.map(([v, l]) => <div key={l}><b>{String(v).padStart(2, '0')}</b><span>{l}</span></div>)}
    </div>
  );
}
