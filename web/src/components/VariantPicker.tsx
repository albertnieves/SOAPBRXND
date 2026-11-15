'use client';
import { useState } from 'react';

type Option = { id: string; label: string; price: string; stock: string; available: number };

export function VariantPicker({ options, canBuy, legend, action, back }: { options: Option[]; canBuy: boolean; legend: string; action: (f: FormData) => Promise<void>; back: string }) {
  const first = options.find((o) => o.available > 0) ?? options[0]!;
  const [sel, setSel] = useState(first.id);
  const cur = options.find((o) => o.id === sel) ?? first;
  return (
    <form action={action} className="tk-picker">
      <input type="hidden" name="back" value={back} />
      <p className="tk-price" data-testid="price">{cur.price}</p>
      <fieldset>
        <legend>{legend}</legend>
        <div className="tk-opts">
          {options.map((o) => (
            <label key={o.id} className={`tk-opt ${o.available < 1 ? 'is-off' : ''}`}>
              <input type="radio" name="variantId" value={o.id} checked={sel === o.id} disabled={o.available < 1} onChange={() => setSel(o.id)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className={`tk-stock ${cur.available < 1 ? 'is-out' : cur.available <= 3 ? 'is-low' : ''}`} data-testid="stock" aria-live="polite">{cur.stock}</p>
      {canBuy && <button className="tk-btn" type="submit" disabled={cur.available < 1}>Añadir a la bolsa</button>}
    </form>
  );
}
