'use client';
import { useActionState } from 'react';
import { startCheckout, type CheckoutState } from '@/modules/checkout/actions';

export function CheckoutForm({ requestId, enabled }: { requestId: string; enabled: boolean }) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, { error: null });
  return (
    <form action={action} className="tk-form">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="is-full">Nombre y apellidos<input name="full_name" required maxLength={120} autoComplete="name" /></label>
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Teléfono<input name="phone" type="tel" required autoComplete="tel" /></label>
      <label className="is-full">Dirección<input name="address_line1" required maxLength={200} autoComplete="address-line1" /></label>
      <label className="is-full">Piso o puerta (opcional)<input name="address_line2" maxLength={200} autoComplete="address-line2" /></label>
      <label>Código postal<input name="postal_code" required pattern="[0-9]{5}" inputMode="numeric" autoComplete="postal-code" /></label>
      <label>Ciudad<input name="city" required maxLength={120} autoComplete="address-level2" /></label>
      <label className="is-full">Provincia<input name="province" maxLength={120} autoComplete="address-level1" /></label>
      {state.error && <p className="tk-alert is-full" role="alert">{state.error}</p>}
      <p className="is-full"><button className="tk-btn" type="submit" disabled={!enabled || pending}>{pending ? 'Preparando el pago…' : 'Pagar con tarjeta'}</button></p>
      <p className="is-full" style={{ fontSize: 15, color: 'var(--muted)' }}>Guardamos tus piezas 35 minutos mientras pagas. Al pagar aceptas las <a href="/legal/condiciones">condiciones de venta</a>.</p>
    </form>
  );
}
