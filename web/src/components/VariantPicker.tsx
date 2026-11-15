'use client';
import { useState } from 'react';

type Option = { id: string; label: string; price: string; stock: string; available: number };

export function VariantPicker({ options, canBuy, action, back }: { options: Option[]; canBuy: boolean; action: (f: FormData) => Promise<void>; back: string }) {
  const first = options.find((o) => o.available > 0) ?? options[0]!;
  const [sel, setSel] = useState(first.id);
  const cur = options.find((o) => o.id === sel) ?? first;
  return (
    <form action={action} className="picker">
      <input type="hidden" name="back" value={back} />
      <p className="price" data-testid="price">{cur.price}</p>
      <fieldset>
        <legend className="eyebrow">Elige</legend>
        <div className="opts">
          {options.map((o) => (
            <label key={o.id} className={`opt ${o.available < 1 ? 'off' : ''}`}>
              <input type="radio" name="variantId" value={o.id} checked={sel === o.id} disabled={o.available < 1} onChange={() => setSel(o.id)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className={`stock ${cur.available < 1 ? 'out' : cur.available <= 3 ? 'low' : ''}`} data-testid="stock">{cur.stock}</p>
      {canBuy && <button className="btn" type="submit" disabled={cur.available < 1}>Añadir a la bolsa</button>}
    </form>
  );
}
