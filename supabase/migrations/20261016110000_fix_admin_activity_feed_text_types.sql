-- Ensure varchar values from auth.users match the RPC's declared text columns.
create or replace function public.admin_list_activity_feed(p_limit integer default 100)
returns table(
  id uuid,
  event_type text,
  entity_type text,
  entity_id uuid,
  actor_user_id uuid,
  subject_user_id uuid,
  actor_name text,
  actor_email text,
  customer_name text,
  customer_email text,
  customer_phone text,
  title text,
  body text,
  details jsonb,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;

  return query
  select
    e.id,
    e.event_type::text,
    e.entity_type::text,
    e.entity_id,
    e.actor_user_id,
    e.subject_user_id,
    coalesce(
      nullif(ap.full_name, ''),
      nullif(aa.display_name, ''),
      nullif(au.email, ''),
      case when e.actor_user_id is null then 'System' else 'Customer' end
    )::text,
    coalesce(au.email, '')::text,
    coalesce(
      nullif(o.customer_name, ''),
      nullif(sp.full_name, ''),
      nullif(r.author_name, ''),
      nullif(cp.full_name, ''),
      'Customer'
    )::text,
    coalesce(su.email, nullif(o.metadata ->> 'email', ''), '')::text,
    coalesce(nullif(o.customer_phone, ''), nullif(sp.phone, ''), nullif(cp.phone, ''), '')::text,
    e.title::text,
    e.body::text,
    case
      when e.entity_type = 'order' and o.id is not null then e.details || jsonb_build_object(
        'order_number', o.order_number,
        'status', o.status,
        'payment_status', o.payment_status,
        'total', o.total,
        'subtotal', o.subtotal,
        'discount', o.discount,
        'payment_method', o.payment_method,
        'vehicle_model', o.vehicle_model,
        'pickup_store', o.pickup_store,
        'pickup_note', o.pickup_note,
        'coupon_code', coalesce(o.coupon_code_snapshot, o.coupon_code),
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'product_id', i.product_id,
            'product_name', i.product_name,
            'color', i.color,
            'quantity', i.quantity,
            'unit_price', i.unit_price,
            'selected_thickness', i.selected_thickness,
            'selected_stitch', i.selected_stitch,
            'custom_embroidery_text', i.custom_embroidery_text
          ) order by i.id)
          from public.order_items i
          where i.order_id = o.id
        ), '[]'::jsonb)
      )
      when e.entity_type = 'review' and r.id is not null then e.details || jsonb_build_object(
        'product_name', pr.name,
        'rating', r.rating,
        'review_text', coalesce(r.review_text, r.body),
        'is_published', r.is_published,
        'verified_purchase', r.is_verified_purchase
      )
      when e.entity_type = 'support_request' and sr.id is not null then e.details || jsonb_build_object(
        'category', sr.category,
        'subject', sr.subject,
        'message', sr.message,
        'status', sr.status,
        'request_id', sr.id
      )
      when e.entity_type = 'customer' and cp.id is not null then e.details || jsonb_build_object(
        'full_name', cp.full_name,
        'created_at', cp.created_at
      )
      else e.details
    end::jsonb,
    e.created_at::timestamptz,
    reads.read_at::timestamptz
  from public.admin_activity_events e
  left join public.admin_activity_event_reads reads
    on reads.event_id = e.id and reads.admin_user_id = v_user
  left join public.orders o
    on e.entity_type = 'order' and o.id = e.entity_id
  left join public.reviews r
    on e.entity_type = 'review' and r.id = e.entity_id
  left join public.products pr
    on pr.id = r.product_id
  left join public.customer_support_requests sr
    on e.entity_type = 'support_request' and sr.id = e.entity_id
  left join public.profiles ap
    on ap.id = e.actor_user_id
  left join public.profiles cp
    on cp.id = e.subject_user_id
  left join public.profiles sp
    on e.entity_type = 'support_request' and sp.id = sr.user_id
  left join public.admin_users aa
    on aa.user_id = e.actor_user_id
  left join auth.users au
    on au.id = e.actor_user_id
  left join auth.users su
    on su.id = e.subject_user_id
  order by e.created_at desc, e.id desc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$$;
revoke all on function public.admin_list_activity_feed(integer) from public, anon, authenticated;
grant execute on function public.admin_list_activity_feed(integer) to authenticated;
