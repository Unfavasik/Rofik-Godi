-- Razorpay payment attempts are stored against the existing orders/payments records.
-- No customer/order data is deleted or rewritten by this migration.
alter table public.payments
  add column if not exists provider_order_id text;

create unique index if not exists payments_provider_order_id_unique
  on public.payments (provider_order_id)
  where provider_order_id is not null;

create or replace function public.mark_razorpay_payment_paid(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount_paise bigint,
  p_currency text default 'INR'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment public.payments%rowtype;
  v_order public.orders%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role is required';
  end if;
  if p_razorpay_order_id !~ '^order_[A-Za-z0-9]+$'
     or p_razorpay_payment_id !~ '^pay_[A-Za-z0-9]+$'
     or p_amount_paise < 0
     or upper(coalesce(p_currency, '')) <> 'INR' then
    raise exception 'Invalid Razorpay payment details';
  end if;

  select p.* into v_payment
    from public.payments p
   where p.provider = 'RAZORPAY'
     and p.provider_order_id = p_razorpay_order_id
   for update;
  if not found then
    raise exception 'Razorpay order is not linked to a storefront order';
  end if;

  select o.* into v_order
    from public.orders o
   where o.id = v_payment.order_id
   for update;
  if not found then
    raise exception 'Storefront order not found';
  end if;
  if v_order.payment_method <> 'PAY_ONLINE' then
    raise exception 'Order is not configured for online payment';
  end if;
  if v_order.status = 'CANCELLED' then
    raise exception 'Payment cannot be recorded for a cancelled order';
  end if;
  if p_amount_paise <> v_order.total::bigint * 100
     or v_payment.amount <> v_order.total
     or upper(v_payment.currency) <> 'INR' then
    raise exception 'Razorpay amount does not match the order total';
  end if;

  if upper(coalesce(v_order.payment_status, '')) = 'PAID' then
    if v_payment.status = 'paid' and v_payment.provider_payment_id = p_razorpay_payment_id then
      return jsonb_build_object('payment_status', 'PAID', 'already_verified', true);
    end if;
    raise exception 'Order already has a different completed payment';
  end if;
  if upper(coalesce(v_order.payment_status, '')) <> 'PENDING' then
    raise exception 'Only pending online orders can be paid';
  end if;
  if exists (
    select 1
      from public.payments p
     where p.provider = 'RAZORPAY'
       and p.provider_payment_id = p_razorpay_payment_id
       and p.order_id <> v_order.id
  ) then
    raise exception 'Razorpay payment is already linked to another order';
  end if;

  update public.payments
     set provider_payment_id = p_razorpay_payment_id,
         status = 'paid',
         updated_at = now(),
         metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'verified_source', 'razorpay',
           'verified_at', now()
         )
   where id = v_payment.id;

  update public.orders
     set payment_status = 'PAID'
   where id = v_order.id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    null,
    'razorpay_payment_verified',
    'order',
    v_order.id::text,
    jsonb_build_object(
      'order_number', v_order.order_number,
      'payment_method', v_order.payment_method,
      'amount', v_order.total,
      'currency', 'INR',
      'provider_order_id', p_razorpay_order_id,
      'provider_payment_id', p_razorpay_payment_id
    )
  );

  return jsonb_build_object('payment_status', 'PAID', 'already_verified', false);
end;
$$;

revoke all on function public.mark_razorpay_payment_paid(text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.mark_razorpay_payment_paid(text, text, bigint, text) to service_role;
