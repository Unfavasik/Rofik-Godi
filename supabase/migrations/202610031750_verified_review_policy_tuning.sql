-- Consolidate authenticated review visibility into one policy and avoid
-- repeated auth.uid() evaluation. Keep anonymous users limited to published rows.
drop policy if exists reviews_published_read on public.reviews;
drop policy if exists reviews_owner_read on public.reviews;
drop policy if exists reviews_admin_read on public.reviews;

create policy reviews_public_published_read
  on public.reviews for select to anon
  using (is_published = true);

create policy reviews_authenticated_read
  on public.reviews for select to authenticated
  using (
    is_published = true
    or customer_id = (select auth.uid())
    or user_id = (select auth.uid())
    or (select public.is_admin())
  );

create index if not exists reviews_user_id_idx on public.reviews (user_id);
