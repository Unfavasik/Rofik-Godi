-- Keep product publication independent from inventory availability and make gallery replacement atomic.
alter table public.products alter column is_active set default true;
update public.products set is_active = true where is_active is null;

create or replace function public.sync_product_gallery(p_product_id uuid, p_urls text[])
returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  delete from public.product_images where product_id = p_product_id;
  insert into public.product_images (product_id, public_url, sort_order, alt_text)
  select p_product_id, url, ordinality - 1, 'Rofik Godi product image'
  from unnest(coalesce(p_urls, '{}'::text[])) with ordinality as images(url, ordinality);
end;
$$;
revoke all on function public.sync_product_gallery(uuid, text[]) from public, anon;
grant execute on function public.sync_product_gallery(uuid, text[]) to authenticated;

create or replace function public.admin_customer_summary()
returns table (id uuid, name text, email text, phone text, order_count bigint, total_spent numeric, last_order timestamptz, created_at timestamptz, status text)
language sql security definer set search_path = public
as $$
  select p.id, coalesce(nullif(p.full_name, ''), 'Customer'), coalesce(u.email, ''), coalesce(p.phone, ''),
    count(o.id), coalesce(sum(o.total), 0), max(o.created_at), p.created_at,
    case when bool_or(o.status = 'COMPLETED') then 'Returning' when count(o.id) > 0 then 'Active' else 'New' end
  from public.profiles p join auth.users u on u.id = p.id left join public.orders o on o.user_id = p.id
  where public.is_admin() group by p.id, p.full_name, u.email, p.phone, p.created_at order by p.created_at desc;
$$;
revoke all on function public.admin_customer_summary() from public, anon;
grant execute on function public.admin_customer_summary() to authenticated;
