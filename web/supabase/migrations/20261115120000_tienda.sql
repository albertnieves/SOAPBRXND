-- =============================================================================
-- SOAPBRXND · tienda
-- Catálogo centrado en el arte (drop → arte → producto = arte × soporte →
-- variantes), un solo almacén con reservas que caducan, y pagos con Stripe
-- confirmados solo por webhook. Ideas reutilizadas de L'Atelier (adhara-web):
-- precio y stock recalculados en la base, idempotencia por request_id,
-- bloqueo de variantes y funciones solo para service_role.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;

-- -----------------------------------------------------------------------------
-- Catálogo
-- -----------------------------------------------------------------------------
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  number text not null,
  name text not null,
  copy text not null default '',
  draft boolean not null default true,
  announce_at timestamptz,
  key_opens_at timestamptz,
  opens_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.artworks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  kind text not null check (kind in ('patron', 'textura', 'textil')),
  story text not null default '',
  pattern jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.supports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  category text not null check (category in ('prenda', 'arte', 'textil', 'accesorio')),
  options text[] not null default '{}',
  wear jsonb
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  drop_id uuid not null references public.drops (id),
  artwork_id uuid not null references public.artworks (id),
  support_id uuid not null references public.supports (id),
  name text not null,
  description text not null default '',
  care text not null default '',
  color text not null default '#1a1a1e',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index products_drop_idx on public.products (drop_id);
create index products_artwork_idx on public.products (artwork_id);

create table public.variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique,
  options jsonb not null default '{}'::jsonb,
  price_cents integer not null check (price_cents > 0),
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true
);
create index variants_product_idx on public.variants (product_id);

-- Fotos reales de cada producto (Supabase Storage, bucket público «productos»).
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  url text not null check (url ~ '^https://'),
  alt text not null default '',
  position integer not null default 0
);
create index product_images_product_idx on public.product_images (product_id, position);

-- -----------------------------------------------------------------------------
-- Pedidos, reservas y pagos
-- -----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  request_id uuid not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'needs_attention', 'expired', 'cancelled', 'shipped', 'delivered', 'refunded')),
  email text not null,
  full_name text not null,
  phone text,
  address jsonb not null,
  zone text not null check (zone in ('peninsula', 'baleares')),
  items_cents integer not null check (items_cents >= 0),
  shipping_cents integer not null check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  reserved_until timestamptz not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  paid_amount_cents integer,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.variants (id),
  sku text not null,
  product_name text not null,
  variant_label text not null,
  quantity integer not null check (quantity between 1 and 10),
  unit_cents integer not null check (unit_cents > 0),
  line_cents integer not null check (line_cents > 0),
  unique (order_id, variant_id)
);

-- Una reserva por línea de un pedido pendiente; disponible = stock − reservas vivas.
create table public.holds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.variants (id),
  quantity integer not null check (quantity > 0),
  expires_at timestamptz not null
);
create index holds_variant_idx on public.holds (variant_id, expires_at);
create index holds_order_idx on public.holds (order_id);

-- Cada evento de Stripe se procesa una sola vez.
create table public.stripe_events (
  id text primary key,
  type text not null,
  order_id uuid references public.orders (id),
  received_at timestamptz not null default now()
);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  drop_id uuid not null references public.drops (id),
  consent boolean not null,
  created_at timestamptz not null default now(),
  unique (email, drop_id)
);

create table public.drop_keys (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops (id),
  code_hash text not null unique,
  max_uses integer not null default 1 check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz
);

-- -----------------------------------------------------------------------------
-- Reglas en la base
-- -----------------------------------------------------------------------------
create or replace function private.shipping_zone(p_postal text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_postal is null or p_postal !~ '^(0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$' then null
    when left(p_postal, 2) = '07' then 'baleares'
    when left(p_postal, 2) in ('35', '38', '51', '52') then null
    else 'peninsula'
  end
$$;

-- Mismas tarifas que src/modules/checkout/quote.ts.
create or replace function private.shipping_cents(p_zone text, p_items bigint)
returns integer language sql immutable set search_path = '' as $$
  select case p_zone
    when 'peninsula' then case when p_items >= 10000 then 0 else 490 end
    when 'baleares' then 790
  end
$$;

-- security definer: la vista pública la llama como anon, que no puede leer holds.
create or replace function private.held(p_variant uuid, p_except uuid default null)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(h.quantity), 0)::integer
  from public.holds h
  where h.variant_id = p_variant and h.expires_at > now()
    and (p_except is null or h.order_id <> p_except)
$$;

create or replace function private.drop_visible(p_drop public.drops)
returns boolean language sql stable set search_path = '' as $$
  select not p_drop.draft and coalesce(p_drop.announce_at, p_drop.opens_at) <= now()
$$;

create or replace function private.drop_open(p_drop public.drops)
returns boolean language sql stable set search_path = '' as $$
  select not p_drop.draft and p_drop.opens_at is not null and p_drop.opens_at <= now()
    and (p_drop.archived_at is null or p_drop.archived_at > now())
$$;

create or replace function private.order_summary(p_order public.orders)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'order_id', p_order.id, 'number', p_order.number, 'status', p_order.status,
    'items_cents', p_order.items_cents, 'shipping_cents', p_order.shipping_cents,
    'total_cents', p_order.total_cents, 'reserved_until', p_order.reserved_until,
    'email', p_order.email, 'stripe_session_id', p_order.stripe_session_id,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
        'variant_id', l.variant_id, 'sku', l.sku, 'product_name', l.product_name,
        'variant_label', l.variant_label, 'quantity', l.quantity, 'unit_cents', l.unit_cents
      ) order by l.product_name, l.variant_label)
      from public.order_lines l where l.order_id = p_order.id), '[]'::jsonb)
  )
$$;

-- -----------------------------------------------------------------------------
-- Catálogo público (lo que lee la tienda con la clave anónima)
-- -----------------------------------------------------------------------------
create view public.catalog_variants as
select
  v.id as variant_id, v.sku, v.options, v.price_cents,
  greatest(0, v.stock - private.held(v.id))::integer as available,
  p.id as product_id, p.slug as product_slug, p.name as product_name, p.color,
  d.id as drop_id, d.slug as drop_slug, d.number as drop_number,
  private.drop_open(d) as purchasable,
  a.slug as artwork_slug, a.kind as artwork_kind,
  s.slug as support_slug, s.category as support_category
from public.variants v
join public.products p on p.id = v.product_id
join public.drops d on d.id = p.drop_id
join public.artworks a on a.id = p.artwork_id
join public.supports s on s.id = p.support_id
where v.active and p.active and private.drop_visible(d);

-- -----------------------------------------------------------------------------
-- Checkout
-- -----------------------------------------------------------------------------
-- Crea el pedido, recalcula precios y envío, y reserva el stock. Idempotente
-- por p_request_id. Lo llama el servidor con la clave de servicio.
create or replace function public.checkout_create(
  p_request_id uuid, p_items jsonb, p_contact jsonb, p_hold_minutes integer default 30
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_items jsonb;
  v_bad uuid;
  v_items_cents bigint;
  v_zone text;
  v_name text := btrim(coalesce(p_contact ->> 'full_name', ''));
  v_email text := lower(btrim(coalesce(p_contact ->> 'email', '')));
  v_phone text := nullif(btrim(coalesce(p_contact ->> 'phone', '')), '');
  v_line1 text := nullif(btrim(coalesce(p_contact ->> 'address_line1', '')), '');
  v_line2 text := nullif(btrim(coalesce(p_contact ->> 'address_line2', '')), '');
  v_postal text := btrim(coalesce(p_contact ->> 'postal_code', ''));
  v_city text := nullif(btrim(coalesce(p_contact ->> 'city', '')), '');
  v_province text := nullif(btrim(coalesce(p_contact ->> 'province', '')), '');
begin
  if p_request_id is null or p_hold_minutes is null or p_hold_minutes not between 5 and 120 then
    raise exception 'invalid_order' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 20
     or exists (
       select 1 from jsonb_array_elements(p_items) e
       where jsonb_typeof(e) <> 'object'
          or coalesce(e ->> 'variant_id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          or case when coalesce(e ->> 'quantity', '') ~ '^[0-9]{1,2}$'
                  then (e ->> 'quantity')::integer not between 1 and 10 else true end
     ) then
    raise exception 'invalid_items' using errcode = '22023';
  end if;
  select jsonb_agg(jsonb_build_object('variant_id', s.variant_id, 'quantity', s.quantity))
  into v_items
  from (
    select (e ->> 'variant_id')::uuid as variant_id, least(sum((e ->> 'quantity')::integer), 10) as quantity
    from jsonb_array_elements(p_items) e group by 1
  ) s;

  if jsonb_typeof(p_contact) is distinct from 'object'
     or char_length(v_name) not between 1 and 120
     or char_length(v_email) > 254
     or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or v_phone is null or v_phone !~ '^[0-9 +().-]{6,30}$' then
    raise exception 'invalid_contact' using errcode = '22023';
  end if;
  if v_line1 is null or char_length(v_line1) > 200 or char_length(coalesce(v_line2, '')) > 200
     or v_postal !~ '^[0-9]{5}$' or v_city is null or char_length(v_city) > 120
     or char_length(coalesce(v_province, '')) > 120 then
    raise exception 'invalid_address' using errcode = '22023';
  end if;
  v_zone := private.shipping_zone(v_postal);
  if v_zone is null then
    raise exception 'shipping_zone_unavailable' using errcode = '22023';
  end if;

  -- Reintento con la misma clave: el pedido ya creado.
  select * into v_order from public.orders o where o.request_id = p_request_id;
  if found then
    return private.order_summary(v_order);
  end if;

  -- Freno a acaparar stock sin pagar: como mucho 3 pagos a medias por email.
  if (select count(*) from public.orders o
      where o.email = v_email and o.status = 'pending' and o.reserved_until > now()) >= 3 then
    raise exception 'too_many_pending' using errcode = '22023';
  end if;

  -- Variantes bloqueadas en orden fijo: dos compras de la última unidad se
  -- ponen en fila y la segunda ve la reserva de la primera.
  perform 1 from public.variants v
  where v.id in (select (x ->> 'variant_id')::uuid from jsonb_array_elements(v_items) x)
  order by v.id
  for update;

  -- Doble clic simultáneo con la misma clave: mientras esperábamos el bloqueo,
  -- el otro envío ya creó el pedido.
  select * into v_order from public.orders o where o.request_id = p_request_id;
  if found then
    return private.order_summary(v_order);
  end if;

  select (x ->> 'variant_id')::uuid into v_bad
  from jsonb_array_elements(v_items) x
  where not exists (
    select 1 from public.variants v
    join public.products p on p.id = v.product_id
    join public.drops d on d.id = p.drop_id
    where v.id = (x ->> 'variant_id')::uuid and v.active and p.active and private.drop_open(d)
  )
  limit 1;
  if v_bad is not null then
    raise exception 'unavailable_variant' using errcode = '22023', detail = v_bad::text;
  end if;

  select (x ->> 'variant_id')::uuid into v_bad
  from jsonb_array_elements(v_items) x
  join public.variants v on v.id = (x ->> 'variant_id')::uuid
  where (x ->> 'quantity')::integer > v.stock - private.held(v.id)
  limit 1;
  if v_bad is not null then
    raise exception 'insufficient_stock' using errcode = '22023', detail = v_bad::text;
  end if;

  select coalesce(sum((x ->> 'quantity')::bigint * v.price_cents), 0) into v_items_cents
  from jsonb_array_elements(v_items) x
  join public.variants v on v.id = (x ->> 'variant_id')::uuid;
  if v_items_cents + private.shipping_cents(v_zone, v_items_cents) > 2147483647 then
    raise exception 'invalid_amount' using errcode = '22023';
  end if;

  insert into public.orders (
    request_id, email, full_name, phone, address, zone, items_cents, shipping_cents,
    total_cents, reserved_until
  ) values (
    p_request_id, v_email, v_name, v_phone,
    jsonb_build_object('line1', v_line1, 'line2', v_line2, 'postal_code', v_postal,
                       'city', v_city, 'province', v_province, 'country', 'ES'),
    v_zone, v_items_cents::integer, private.shipping_cents(v_zone, v_items_cents),
    (v_items_cents + private.shipping_cents(v_zone, v_items_cents))::integer,
    now() + make_interval(mins => p_hold_minutes)
  )
  on conflict (request_id) do nothing
  returning * into v_order;
  if v_order.id is null then
    select * into v_order from public.orders o where o.request_id = p_request_id;
    return private.order_summary(v_order);
  end if;

  insert into public.order_lines (order_id, variant_id, sku, product_name, variant_label, quantity, unit_cents, line_cents)
  select v_order.id, v.id, v.sku, p.name,
         coalesce((select string_agg(v.options ->> k.key, ' · ' order by k.ord)
                   from unnest(s.options) with ordinality as k(key, ord)), ''),
         (x ->> 'quantity')::integer, v.price_cents, (x ->> 'quantity')::integer * v.price_cents
  from jsonb_array_elements(v_items) x
  join public.variants v on v.id = (x ->> 'variant_id')::uuid
  join public.products p on p.id = v.product_id
  join public.supports s on s.id = p.support_id;

  insert into public.holds (order_id, variant_id, quantity, expires_at)
  select v_order.id, (x ->> 'variant_id')::uuid, (x ->> 'quantity')::integer, v_order.reserved_until
  from jsonb_array_elements(v_items) x;

  return private.order_summary(v_order);
end;
$$;

create or replace function public.checkout_attach_session(p_order uuid, p_session text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set stripe_session_id = p_session, updated_at = now()
  where id = p_order and status = 'pending';
  if not found then
    raise exception 'order_not_pending' using errcode = '22023';
  end if;
end;
$$;

-- checkout.session.completed (pagado). Idempotente por evento de Stripe.
create or replace function public.checkout_confirm_paid(
  p_event_id text, p_session text, p_amount_total integer, p_payment_intent text
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
  select * into v_order from public.orders o where o.stripe_session_id = p_session for update;
  if not found then
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
    v_status := case when p_amount_total = v_order.total_cents then 'paid' else 'needs_attention' end;
  end if;

  update public.orders
  set status = v_status, paid_amount_cents = p_amount_total, stripe_payment_intent = p_payment_intent,
      paid_at = now(), updated_at = now()
  where id = v_order.id;
  return jsonb_build_object('status', v_status, 'order_id', v_order.id);
end;
$$;

-- checkout.session.expired: libera la reserva.
create or replace function public.checkout_expire(p_event_id text, p_session text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  insert into public.stripe_events (id, type) values (p_event_id, 'checkout.session.expired')
  on conflict (id) do nothing;
  if not found then
    return jsonb_build_object('status', 'duplicate');
  end if;
  select * into v_order from public.orders o where o.stripe_session_id = p_session for update;
  if not found then
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

-- El cliente vuelve de Stripe sin pagar y empieza otro pago: se libera el
-- pedido anterior (el servidor caduca antes su sesión de Stripe).
create or replace function public.checkout_release(p_order uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders o where o.id = p_order for update;
  if not found then
    return jsonb_build_object('status', 'unknown_order');
  end if;
  if v_order.status = 'pending' then
    delete from public.holds where order_id = v_order.id;
    update public.orders set status = 'cancelled', updated_at = now() where id = v_order.id
    returning * into v_order;
  end if;
  return jsonb_build_object('status', v_order.status, 'order_id', v_order.id, 'stripe_session_id', v_order.stripe_session_id);
end;
$$;

-- Cron: caduca pedidos pendientes cuya reserva venció. Devuelve cuántos.
create or replace function public.holds_release_expired()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  -- Primero los pedidos y luego sus reservas: el mismo orden de bloqueo que
  -- checkout_confirm_paid, para que un pago tardío no se cruce con el cron.
  update public.orders o set status = 'expired', updated_at = now()
  where o.status = 'pending' and o.reserved_until <= now();
  get diagnostics v_count = row_count;
  delete from public.holds h where h.expires_at <= now();
  return v_count;
end;
$$;

create or replace function public.order_status(p_order uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.order_summary(o) from public.orders o where o.id = p_order
$$;

-- -----------------------------------------------------------------------------
-- Permisos y RLS
-- -----------------------------------------------------------------------------
alter table public.drops enable row level security;
alter table public.artworks enable row level security;
alter table public.supports enable row level security;
alter table public.products enable row level security;
alter table public.variants enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.holds enable row level security;
alter table public.stripe_events enable row level security;
alter table public.waitlist enable row level security;
alter table public.drop_keys enable row level security;

create policy drops_public_read on public.drops for select to anon, authenticated
  using (private.drop_visible(drops));
-- Un arte se ve cuando está en alguna pieza de un drop visible.
create policy artworks_public_read on public.artworks for select to anon, authenticated
  using (exists (select 1 from public.products p where p.artwork_id = artworks.id));
create policy supports_public_read on public.supports for select to anon, authenticated using (true);
create policy products_public_read on public.products for select to anon, authenticated
  using (active and exists (select 1 from public.drops d where d.id = products.drop_id));
create policy variants_public_read on public.variants for select to anon, authenticated
  using (active and exists (select 1 from public.products p where p.id = variants.product_id));

create policy product_images_public_read on public.product_images for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_images.product_id));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.drops, public.artworks, public.supports, public.products, public.variants,
  public.product_images, public.catalog_variants to anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.drop_visible(public.drops) to anon, authenticated;

revoke all on function public.checkout_create(uuid, jsonb, jsonb, integer) from public, anon, authenticated;
revoke all on function public.checkout_attach_session(uuid, text) from public, anon, authenticated;
revoke all on function public.checkout_confirm_paid(text, text, integer, text) from public, anon, authenticated;
revoke all on function public.checkout_expire(text, text) from public, anon, authenticated;
revoke all on function public.holds_release_expired() from public, anon, authenticated;
revoke all on function public.order_status(uuid) from public, anon, authenticated;
revoke all on function public.checkout_release(uuid) from public, anon, authenticated;
grant execute on function public.checkout_create(uuid, jsonb, jsonb, integer),
  public.checkout_attach_session(uuid, text), public.checkout_confirm_paid(text, text, integer, text),
  public.checkout_expire(text, text), public.holds_release_expired(), public.order_status(uuid),
  public.checkout_release(uuid)
  to service_role;
