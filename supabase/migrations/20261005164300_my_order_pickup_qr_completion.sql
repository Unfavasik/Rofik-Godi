-- Let an authenticated customer retrieve a fresh one-time pickup token for their own
-- active store-pickup order. The raw token is returned only once; only its hash is stored.
create or replace function public.issue_my_store_pickup_token(p_order_number text)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order_id uuid;
  v_status text;
  v_order_number text := regexp_replace(btrim(coalesce(p_order_number, '')), '^#', '');
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to view your pickup QR';
  end if;
  if length(v_order_number) not between 1 and 80 then
    raise exception 'Pickup QR is not available for this order';
  end if;

  select o.id, o.status
    into v_order_id, v_status
    from public.orders o
   where o.order_number = v_order_number
     and o.user_id = auth.uid()
     and o.fulfillment_method = 'STORE_PICKUP'
   for update;
  if not found then
    raise exception 'Pickup QR is not available for this order';
  end if;

  -- A picked-up, completed or cancelled order cannot receive another usable code.
  if v_status not in ('NEW', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP') then
    return null;
  end if;

  v_token := upper(encode(extensions.gen_random_bytes(24), 'hex'));
  insert into public.pickup_tokens (order_id, token_hash, expires_at, used_at, created_at)
  values (
    v_order_id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    now() + interval '30 days',
    null,
    now()
  )
  on conflict (order_id) do update
    set token_hash = excluded.token_hash,
        expires_at = excluded.expires_at,
        used_at = null,
        created_at = now();

  return v_token;
end;
$$;
revoke all on function public.issue_my_store_pickup_token(text) from public, anon, authenticated;
grant execute on function public.issue_my_store_pickup_token(text) to authenticated;

-- A valid, one-time admin scan advances through the two permitted fulfillment
-- states in the same transaction, so a successful scan ends at COMPLETED.
create or replace function public.verify_store_pickup_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
  v_picked_up_at timestamptz := now();
  v_completed_at timestamptz := now();
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;
  if length(trim(coalesce(p_token, ''))) < 20 then
    raise exception 'Invalid pickup token';
  end if;

  select pt.order_id
    into v_order_id
    from public.pickup_tokens pt
   where pt.token_hash = encode(extensions.digest(upper(trim(p_token)), 'sha256'), 'hex')
     and pt.used_at is null
     and pt.expires_at > now()
   for update;
  if not found then
    raise exception 'Pickup token is invalid, expired, or already used';
  end if;

  select o.*
    into v_order
    from public.orders o
   where o.id = v_order_id
     and o.fulfillment_method = 'STORE_PICKUP'
   for update;
  if not found then
    raise exception 'Store-pickup order not found';
  end if;
  if v_order.status <> 'READY_FOR_PICKUP' then
    raise exception 'Order is not ready for pickup';
  end if;

  update public.orders o
     set status = 'PICKED_UP',
         picked_up_at = coalesce(v_order.picked_up_at, v_picked_up_at)
   where o.id = v_order_id
   returning * into v_order;
  if not found then
    raise exception 'Order pickup could not be recorded';
  end if;

  update public.orders o
     set status = 'COMPLETED',
         completed_at = coalesce(v_order.completed_at, v_completed_at)
   where o.id = v_order_id
   returning * into v_order;
  if not found then
    raise exception 'Order completion could not be recorded';
  end if;

  update public.pickup_tokens pt
     set used_at = v_completed_at
   where pt.order_id = v_order_id;

  return jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'picked_up_at', v_order.picked_up_at,
    'completed_at', v_order.completed_at
  );
end;
$$;
revoke all on function public.verify_store_pickup_token(text) from public, anon, authenticated;
grant execute on function public.verify_store_pickup_token(text) to authenticated;
