-- =============================================================================
-- SOAPBRXND · avisos del advisor de Supabase y pagos más robustos
--  1. security_definer_view: la vista del catálogo se ejecuta con los permisos
--     de quien consulta, no con los de su dueño (que se salta RLS).
--  2. Permisos explícitos en el esquema private: solo se puede ejecutar lo que
--     necesita la vista pública. Postgres da EXECUTE a PUBLIC en cada función
--     nueva, así que cada función nueva en private lleva su «revoke» (la prueba
--     del advisor falla si falta).
--  3. unindexed_foreign_keys: un índice por cada clave foránea que no lo tenía.
--  4. Stripe: comprobar la moneda y encontrar el pedido por metadata.order_id
--     cuando la sesión no llegó a enlazarse (checkout_attach_session falló).
-- Las pruebas de tests/unit/db/advisor.test.ts comprueban 1–3 en cada PR.
-- =============================================================================

-- 1. Vista con los permisos de quien consulta. anon ya puede leer las tablas
-- del catálogo (con RLS) y las reservas las cuenta private.held (definer).
alter view public.catalog_variants set (security_invoker = true);

-- 2. Permisos explícitos en private.
revoke all on all functions in schema private from public;
grant usage on schema private to service_role;
grant execute on function private.drop_visible(public.drops), private.drop_open(public.drops),
  private.held(uuid, uuid)
  to anon, authenticated, service_role;

-- 3. Índices de claves foráneas.
create index products_support_idx on public.products (support_id);
create index order_lines_variant_idx on public.order_lines (variant_id);
create index stripe_events_order_idx on public.stripe_events (order_id);
create index waitlist_drop_idx on public.waitlist (drop_id);
create index drop_keys_drop_idx on public.drop_keys (drop_id);

-- 4. Pedido de una sesión de Stripe: por id de sesión o, si la sesión nunca
-- se enlazó, por metadata.order_id — solo si el pedido no tiene otra sesión.
-- Devuelve el pedido bloqueado y ya enlazado.
create or replace function private.order_for_session(p_session text, p_order uuid)
returns public.orders language plpgsql set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders o where o.stripe_session_id = p_session for update;
  if found or p_order is null then
    return v_order;
  end if;
  select * into v_order from public.orders o
  where o.id = p_order and o.stripe_session_id is null for update;
  if found then
    update public.orders set stripe_session_id = p_session, updated_at = now() where id = v_order.id;
    v_order.stripe_session_id := p_session;
  end if;
  return v_order;
end;
$$;
revoke all on function private.order_for_session(text, uuid) from public;

drop function public.checkout_confirm_paid(text, text, integer, text);
create function public.checkout_confirm_paid(
  p_event_id text, p_session text, p_amount_total integer, p_payment_intent text,
  p_currency text, p_order uuid default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_short uuid;
  v_status text;
begin
  insert into public.stripe_events (id, type) values (p_event_id, 'checkout.session.completed')
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;
  v_order := private.order_for_session(p_session, p_order);
  if v_order.id is null then
    return jsonb_build_object('status', 'unknown_session');
  end if;
  update public.stripe_events set order_id = v_order.id where id = p_event_id;
  -- 'cancelled': el cliente abandonó el pago y volvió a la bolsa, pero la sesión
  -- vieja se pagó igualmente. Se cobra si queda stock; si no, a revisar.
  if v_order.status not in ('pending', 'expired', 'cancelled') then
    return jsonb_build_object('status', v_order.status, 'order_id', v_order.id);
  end if;

  perform 1 from public.variants v
  where v.id in (select l.variant_id from public.order_lines l where l.order_id = v_order.id)
  order by v.id
  for update;

  -- ¿Sigue habiendo stock? (sin contar las reservas de este mismo pedido)
  select l.variant_id into v_short
  from public.order_lines l join public.variants v on v.id = l.variant_id
  where l.order_id = v_order.id and l.quantity > v.stock - private.held(v.id, v_order.id)
  limit 1;

  delete from public.holds where order_id = v_order.id;
  if v_short is not null then
    -- Cobrado sin stock (pagó tras caducar la reserva y otro compró): a revisar y reembolsar.
    v_status := 'needs_attention';
  else
    update public.variants v set stock = v.stock - l.quantity
    from public.order_lines l
    where l.order_id = v_order.id and l.variant_id = v.id;
    -- Importe o moneda que no cuadran: se cobra el stock, pero a revisar.
    v_status := case
      when p_amount_total = v_order.total_cents and lower(coalesce(p_currency, '')) = 'eur' then 'paid'
      else 'needs_attention'
    end;
  end if;

  update public.orders
  set status = v_status, paid_amount_cents = p_amount_total, stripe_payment_intent = p_payment_intent,
      paid_at = now(), updated_at = now()
  where id = v_order.id;
  return jsonb_build_object('status', v_status, 'order_id', v_order.id);
end;
$$;

drop function public.checkout_expire(text, text);
create function public.checkout_expire(p_event_id text, p_session text, p_order uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  insert into public.stripe_events (id, type) values (p_event_id, 'checkout.session.expired')
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;
  v_order := private.order_for_session(p_session, p_order);
  if v_order.id is null then
    return jsonb_build_object('status', 'unknown_session');
  end if;
  update public.stripe_events set order_id = v_order.id where id = p_event_id;
  if v_order.status = 'pending' then
    delete from public.holds where order_id = v_order.id;
    update public.orders set status = 'expired', updated_at = now() where id = v_order.id;
    return jsonb_build_object('status', 'expired', 'order_id', v_order.id);
  end if;
  return jsonb_build_object('status', v_order.status, 'order_id', v_order.id);
end;
$$;

revoke all on function public.checkout_confirm_paid(text, text, integer, text, text, uuid) from public, anon, authenticated;
revoke all on function public.checkout_expire(text, text, uuid) from public, anon, authenticated;
grant execute on function public.checkout_confirm_paid(text, text, integer, text, text, uuid),
  public.checkout_expire(text, text, uuid)
  to service_role;
