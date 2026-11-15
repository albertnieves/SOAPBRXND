'use client';
import { useEffect, useState } from 'react';

export function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (now === null) return null;
  let s = Math.max(0, Math.floor((Date.parse(to) - now) / 1000));
  const parts: [number, string][] = [[Math.floor(s / 86400), 'días'], [Math.floor(s / 3600) % 24, 'h'], [Math.floor(s / 60) % 60, 'min'], [(s %= 60), 's']];
  return (
    <div className="count" aria-label="Cuenta atrás">
      {parts.map(([v, l]) => <div key={l}><b>{String(v).padStart(2, '0')}</b><span>{l}</span></div>)}
    </div>
  );
}
