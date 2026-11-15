import { describe, expect, it } from 'vitest';
import { ORDER_STATUSES, orderMessage } from '@/modules/checkout/order-copy';

describe('mensajes de /pedido', () => {
  it('ningún estado promete un email (todavía no se envían)', () => {
    for (const s of ORDER_STATUSES) expect(orderMessage(s).toLowerCase(), s).not.toMatch(/email|correo/);
  });
  it('una reserva caducada no se presenta como pagada', () => {
    expect(orderMessage('expired')).toMatch(/caduc/);
  });
});
