'use client';
import { useEffect } from 'react';
import { CART_COOKIE } from '@/modules/checkout/cart';

/** Vacía la bolsa en este navegador cuando el pedido ya está pagado. */
export function ClearBag() {
  useEffect(() => { document.cookie = `${CART_COOKIE}=; path=/; max-age=0; samesite=lax`; }, []);
  return null;
}
