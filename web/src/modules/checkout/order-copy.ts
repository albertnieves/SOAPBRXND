/* Qué ve el cliente en /pedido según el estado. Sin promesas de email: aún no se envían. */
export const ORDER_STATUSES = ['pending', 'paid', 'needs_attention', 'expired', 'cancelled', 'shipped', 'delivered', 'refunded'] as const;

const COPY: Record<string, string> = {
  pending: 'Confirmando el pago con el banco… recarga en unos segundos.',
  paid: 'Pagado. Lo estamos preparando. Guarda esta página para seguir tu pedido.',
  needs_attention: 'Pago recibido. Lo estamos revisando y nos pondremos en contacto contigo.',
  expired: 'La reserva caducó sin pago. Tu bolsa sigue disponible.',
  cancelled: 'Este pago se canceló. Tu bolsa sigue disponible.',
  shipped: 'Enviado.',
  delivered: 'Entregado.',
  refunded: 'Reembolsado.',
};

export const orderMessage = (status: string) => COPY[status] ?? status;
