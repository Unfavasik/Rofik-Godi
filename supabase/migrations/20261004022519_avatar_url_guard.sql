-- Remove legacy or foreign avatar URLs before enforcing per-user public WebP paths.
update public.profiles
set avatar_url = null
where avatar_url is not null
  and avatar_url !~ (
    '^https?://[^/]+/storage/v1/object/public/avatars/' || id::text || '/[^/]+\.webp$'
  );

alter table public.profiles
  drop constraint if exists profiles_avatar_url_own_path;

alter table public.profiles
  add constraint profiles_avatar_url_own_path
  check (
    avatar_url is null
    or avatar_url ~ (
      '^https?://[^/]+/storage/v1/object/public/avatars/' || id::text || '/[^/]+\.webp$'
    )
  );
