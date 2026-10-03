-- Verified-purchase product reviews. Keep legacy columns for backwards-compatible
-- reads, but make the new order-linked columns and RPCs the only write path.

alter table public.reviews
  add column if not exists customer_id uuid references public.profiles(id) on delete cascade,
  add column if not exists order_id uuid references public.orders(id) on delete cascade,
  add column if not exists review_text text,
  add column if not exists is_verified_purchase boolean not null default false,
  add column if not exists is_published boolean not null default false;

-- Preserve legacy content and publication state. Legacy verification claims are
-- retained only when an order/product relationship can actually prove them.
update public.reviews r
   set customer_id = coalesce(r.customer_id, case when exists (select 1 from public.profiles p where p.id = r.user_id) then r.user_id end),
       review_text = coalesce(r.review_text, r.body),
       is_published = (r.status = 'published');

update public.reviews r
   set is_verified_purchase = true
 where coalesce(r.verified_purchase, false)
   and r.customer_id is not null
   and r.order_id is not null
   and exists (
     select 1
       from public.orders o
       join public.order_items oi on oi.order_id = o.id
      where o.id = r.order_id
        and o.user_id = r.customer_id
        and o.status = 'COMPLETED'
        and oi.product_id = r.product_id
   );
update public.reviews set verified_purchase = is_verified_purchase;

alter table public.reviews
  add constraint reviews_review_text_length_check
  check (review_text is null or char_length(review_text) <= 2000);

create unique index if not exists reviews_customer_product_order_uidx
  on public.reviews (customer_id, product_id, order_id)
  where customer_id is not null and order_id is not null;
create index if not exists reviews_product_published_created_idx
  on public.reviews (product_id, created_at desc) where is_published;
create index if not exists reviews_customer_idx on public.reviews (customer_id);
create index if not exists reviews_order_idx on public.reviews (order_id);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);
create index if not exists reviews_published_idx on public.reviews (is_published);

alter table public.reviews enable row level security;
drop policy if exists reviews_admin_all on public.reviews;
drop policy if exists reviews_own_insert on public.reviews;
drop policy if exists reviews_own_read on public.reviews;
drop policy if exists reviews_public_published_read on public.reviews;
drop policy if exists reviews_published_read on public.reviews;
drop policy if exists reviews_owner_read on public.reviews;
drop policy if exists reviews_admin_read on public.reviews;

create policy reviews_published_read
  on public.reviews for select to anon, authenticated
  using (is_published = true);
create policy reviews_owner_read
  on public.reviews for select to authenticated
  using (customer_id = auth.uid() or user_id = auth.uid());
create policy reviews_admin_read
  on public.reviews for select to authenticated
  using (public.is_admin());

-- No direct browser INSERT/UPDATE/DELETE, including for admins. All mutations
-- are deliberately narrow security-definer RPCs with explicit authorization.
revoke insert, update, delete on table public.reviews from public, anon, authenticated;
grant select on table public.reviews to anon, authenticated;

create or replace function public.create_product_review(
  p_product_id uuid,
  p_order_id uuid,
  p_rating integer,
  p_review_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_review public.reviews%rowtype;
  v_author text;
  v_text text := nullif(btrim(p_review_text), '');
begin
  if v_user_id is null or not exists (select 1 from auth.users u where u.id = v_user_id) then
    raise exception 'Sign in is required to write a review';
  end if;
  if p_product_id is null or p_order_id is null then
    raise exception 'A product and completed order are required';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;
  if v_text is not null and char_length(v_text) > 2000 then
    raise exception 'Review text must be 2,000 characters or fewer';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    raise exception 'Customer profile is not available';
  end if;
  if not exists (
    select 1
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
     where o.id = p_order_id
       and o.user_id = v_user_id
       and o.status = 'COMPLETED'
       and oi.product_id = p_product_id
  ) then
    raise exception 'A completed purchase of this product is required';
  end if;

  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), 'Customer')
    into v_author
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = v_user_id;

  insert into public.reviews (
    product_id, user_id, customer_id, order_id, author_name, rating,
    body, review_text, status, verified_purchase, is_verified_purchase,
    is_published, updated_at
  ) values (
    p_product_id, v_user_id, v_user_id, p_order_id, coalesce(v_author, 'Customer'), p_rating,
    coalesce(v_text, ''), v_text, 'published', true, true, true, now()
  ) returning * into v_review;

  return to_jsonb(v_review);
exception
  when unique_violation then
    raise exception 'You have already reviewed this product for this order' using errcode = '23505';
end;
$$;
revoke all on function public.create_product_review(uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.create_product_review(uuid, uuid, integer, text) to authenticated;

create or replace function public.update_product_review(
  p_review_id uuid,
  p_rating integer,
  p_review_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_text text := nullif(btrim(p_review_text), '');
  v_review public.reviews%rowtype;
begin
  if v_user_id is null then raise exception 'Sign in is required to edit a review'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating must be between 1 and 5'; end if;
  if v_text is not null and char_length(v_text) > 2000 then raise exception 'Review text must be 2,000 characters or fewer'; end if;

  update public.reviews r
     set rating = p_rating,
         body = coalesce(v_text, ''),
         review_text = v_text,
         updated_at = now()
   where r.id = p_review_id
     and r.customer_id = v_user_id
     and r.is_verified_purchase = true
     and exists (
       select 1 from public.orders o
       join public.order_items oi on oi.order_id = o.id
       where o.id = r.order_id
         and o.user_id = v_user_id
         and o.status = 'COMPLETED'
         and oi.product_id = r.product_id
     )
   returning r.* into v_review;
  if not found then raise exception 'Review not found or no longer eligible to edit'; end if;
  return to_jsonb(v_review);
end;
$$;
revoke all on function public.update_product_review(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.update_product_review(uuid, integer, text) to authenticated;

create or replace function public.admin_set_review_published(
  p_review_id uuid,
  p_is_published boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_review public.reviews%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  update public.reviews r
     set is_published = p_is_published,
         status = case when p_is_published then 'published' else 'rejected' end,
         updated_at = now()
   where r.id = p_review_id
   returning r.* into v_review;
  if not found then raise exception 'Review not found'; end if;
  return to_jsonb(v_review);
end;
$$;
revoke all on function public.admin_set_review_published(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_review_published(uuid, boolean) to authenticated;

create or replace function public.admin_delete_review(p_review_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrator access is required'; end if;
  delete from public.reviews where id = p_review_id;
  return found;
end;
$$;
revoke all on function public.admin_delete_review(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_review(uuid) to authenticated;

-- Aggregates stay database-derived. The security-invoker view respects product
-- and review RLS, and never trusts a value supplied by the client.
create or replace view public.product_rating_summary
with (security_invoker = true)
as
select p.id as product_id,
       coalesce(round(avg(r.rating)::numeric, 1), 0::numeric) as average_rating,
       count(r.id)::bigint as review_count,
       count(r.id) filter (where r.rating = 5)::bigint as five_star_count,
       count(r.id) filter (where r.rating = 4)::bigint as four_star_count,
       count(r.id) filter (where r.rating = 3)::bigint as three_star_count,
       count(r.id) filter (where r.rating = 2)::bigint as two_star_count,
       count(r.id) filter (where r.rating = 1)::bigint as one_star_count
  from public.products p
  left join public.reviews r
    on r.product_id = p.id
   and r.is_published = true
 where p.is_active = true
 group by p.id;
grant select on public.product_rating_summary to anon, authenticated;
