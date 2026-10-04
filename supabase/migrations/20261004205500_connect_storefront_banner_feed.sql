-- Public storefronts may read only the whitelisted fields of active banners.
-- Admin-only settings remain protected by the app_settings RLS policy.
create or replace function public.get_active_storefront_banners()
returns table (
  id text,
  title text,
  subtitle text,
  image_url text,
  link_url text,
  button_label text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    banner.value ->> 'id' as id,
    banner.value ->> 'title' as title,
    coalesce(banner.value ->> 'subtitle', '') as subtitle,
    coalesce(banner.value ->> 'imageUrl', '') as image_url,
    coalesce(banner.value ->> 'linkUrl', '/home') as link_url,
    coalesce(nullif(banner.value ->> 'buttonLabel', ''), 'Shop now') as button_label
  from public.app_settings as settings
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(settings.value) = 'array' then settings.value
      else '[]'::jsonb
    end
  ) with ordinality as banner(value, position)
  where settings.key = 'store_banners'
    and banner.value ->> 'active' = 'true'
    and nullif(btrim(banner.value ->> 'title'), '') is not null
  order by banner.position;
$$;

revoke all on function public.get_active_storefront_banners() from public, anon, authenticated;
grant execute on function public.get_active_storefront_banners() to anon, authenticated;
