-- Reapply the final pickup-token behavior after the earlier My Orders QR migrations.
-- Both the account QR and email QR remain one-time, admin-scannable tokens.
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
    select pet.order_id
      into v_order_id
      from public.pickup_email_tokens pet
     where pet.token_hash = encode(extensions.digest(upper(trim(p_token)), 'sha256'), 'hex')
       and pet.used_at is null
       and pet.expires_at > now()
     for update;
  end if;
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
     set used_at = coalesce(pt.used_at, v_completed_at)
   where pt.order_id = v_order_id;
  update public.pickup_email_tokens pet
     set used_at = coalesce(pet.used_at, v_completed_at)
   where pet.order_id = v_order_id;

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

create or replace function public.invalidate_store_pickup_token_on_terminal_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('PICKED_UP', 'COMPLETED', 'CANCELLED')
     and old.status is distinct from new.status then
    update public.pickup_tokens
       set used_at = coalesce(used_at, now())
     where order_id = new.id
       and used_at is null;
    update public.pickup_email_tokens
       set used_at = coalesce(used_at, now())
     where order_id = new.id
       and used_at is null;
  end if;
  return new;
end;
$$;
revoke all on function public.invalidate_store_pickup_token_on_terminal_status() from public, anon, authenticated;

drop trigger if exists invalidate_store_pickup_token_on_terminal_status on public.orders;
create trigger invalidate_store_pickup_token_on_terminal_status
after update of status on public.orders
for each row
when (new.status in ('PICKED_UP', 'COMPLETED', 'CANCELLED') and old.status is distinct from new.status)
execute function public.invalidate_store_pickup_token_on_terminal_status();
