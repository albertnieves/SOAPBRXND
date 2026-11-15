'use client';
import { useActionState } from 'react';
import { startCheckout, type CheckoutState } from '@/modules/checkout/actions';

export function CheckoutForm({ requestId, enabled }: { requestId: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, { error: null });
  return (
    <form action={action} className="form">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="full">Nombre y apellidos<input name="full_name" required maxLength={120} autoComplete="name" /></label>
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Teléfono<input name="phone" type="tel" required autoComplete="tel" /></label>
      <label className="full">Dirección<input name="address_line1" required maxLength={200} autoComplete="address-line1" /></label>
      <label className="full">Piso, puerta… (opcional)<input name="address_line2" maxLength={200} autoComplete="address-line2" /></label>
      <label>Código postal<input name="postal_code" required pattern="[0-9]{5}" inputMode="numeric" autoComplete="postal-code" /></label>
      <label>Ciudad<input name="city" required maxLength={120} autoComplete="address-level2" /></label>
      <label className="full">Provincia<input name="province" maxLength={120} autoComplete="address-level1" /></label>
      {state.error && <p className="alert full" role="alert">{state.error}</p>}
      <p className="full"><button className="btn" type="submit" disabled={!enabled || pending}>{pending ? 'Preparando el pago…' : 'Pagar con Stripe'}</button></p>
      <p className="note full">Al pagar aceptas las condiciones de venta. Reservamos tus piezas 35 minutos mientras pagas.</p>
    </form>
  );
}
