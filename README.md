# Rofik Godi Centre

Storefront and admin catalog for Rofik Godi Centre, built with React, Vite, TypeScript and Supabase.

## Development

```bash
pnpm install
pnpm dev
```

## Quality checks

```bash
pnpm lint       # TypeScript + ESLint
pnpm test       # Catalog, cart, coupon, and order-flow tests
pnpm build
pnpm format
```

## Supabase

Apply migrations in `supabase/migrations/` in order. The catalog migration keeps `is_active` (publication) separate from `in_stock` (availability), adds atomic gallery replacement, and provides the admin customer summary RPC. Product images are converted to WebP and uploaded to the `product-images` Storage bucket.

## Admin login flow

Admin access is verified server-side through `public.admin_users` and the `is_admin()` RPC. The login page uses the same Supabase Auth email/password login for everyone: an authorized admin is redirected to `/admin`; a normal customer is redirected to the storefront/user panel. Use a unique, organization-controlled email address for each administrator; do not use a shared example or generic mailbox. Require email confirmation and enable/require multi-factor authentication (MFA) for administrator accounts in Supabase Auth settings.

Apply the migrations in order, then bootstrap the first administrator once in the Supabase SQL editor after that user has signed up, confirmed their email, and enrolled in MFA. Replace the example address with that administrator's unique confirmed address:

```sql
insert into public.admin_users (user_id, display_name, role)
select id, 'Admin Name', 'admin'
from auth.users
where lower(email) = lower('admin@your-unique-domain.example')
  and email_confirmed_at is not null
on conflict (user_id) do update set display_name = excluded.display_name, role = excluded.role;
```

Only the `admin` role is supported; manager memberships are removed by the role migration and no longer pass `is_admin()`. After one administrator exists, an existing admin can grant or update another admin using `public.grant_admin_by_email(email, display_name, 'admin')`. The `202610032320_admin_grant_audit.sql` migration preserves an existing display name when the optional name is omitted and records the granting admin, target account, and action in `public.admin_role_audit_log`. Do not put admin emails in frontend code or expose a public admin-registration form.
