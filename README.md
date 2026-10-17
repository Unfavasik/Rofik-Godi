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
pnpm test       # Catalog, cart, coupon, order-flow, and profile tests
pnpm build
pnpm format
```

## Supabase

Apply migrations in `supabase/migrations/` in order. Use 14-digit timestamps (`YYYYMMDDHHMMSS`) for new migrations; do not rename migrations already applied. When a project has later-numbered migrations already applied but older timestamps still pending, deploy with `supabase db push --include-all`. The catalog migration keeps `is_active` (publication) separate from `in_stock` (availability), adds atomic gallery replacement, and provides the admin customer summary RPC. Product images are converted to WebP and uploaded to the `product-images` Storage bucket. Customer profile photos use the public-read, WebP-only `avatars` bucket (2 MB object limit); authenticated writes are restricted to each user's own UUID folder.

Customer email is read from Supabase Auth and is not stored in `public.profiles` or editable in the app. In **Supabase Dashboard → Authentication → Settings**, keep **Secure email change** enabled. Email changes, if ever needed, must go through Supabase Auth rather than profile updates.

## Razorpay online payments

Online checkout creates Razorpay Orders from the server-verified `public.orders.total`; the browser never supplies the payable amount. A customer order remains unpaid until the authenticated verification function checks Razorpay's payment signature and captured-payment status, or the signed webhook records the capture. Payment IDs and provider order IDs are stored in `public.payments`; card details are never stored by this app.

Apply `supabase/migrations/20261017232800_razorpay_payments.sql`, then deploy the `create-razorpay-order` and `verify-razorpay-payment` Edge Functions with JWT verification enabled. Deploy `razorpay-webhook` with JWT verification disabled; it verifies the raw request body with Razorpay's webhook signature before accepting `payment.captured` events. In Supabase Dashboard → Edge Functions → Secrets, set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`. Use Razorpay test-mode credentials first. In Razorpay's Webhooks settings, register `https://cyijfvylyhhusackvcuj.supabase.co/functions/v1/razorpay-webhook`, subscribe to `payment.captured`, and use the same webhook secret as `RAZORPAY_WEBHOOK_SECRET`.

## Admin login flow

Admin access is verified server-side through `public.admin_users` and the `is_admin()` RPC. The login page uses the same Supabase Auth email/password login for everyone: after login, an authorized admin is redirected to `/admin` and can return to the storefront; a normal customer is redirected to the storefront/user panel. Use a unique, organization-controlled email address for each administrator; do not use a shared example or generic mailbox. Require email confirmation and enable/require multi-factor authentication (MFA) for administrator accounts in Supabase Auth settings.

Apply the migrations in order, then bootstrap the first administrator once in the Supabase SQL editor after that user has signed up, confirmed their email, and enrolled in MFA. Replace the example address with that administrator's unique confirmed address:

```sql
insert into public.admin_users (user_id, display_name, role)
select id, 'Admin Name', 'admin'
from auth.users
where lower(email) = lower('admin@your-unique-domain.example')
  and email_confirmed_at is not null
on conflict (user_id) do update set display_name = excluded.display_name, role = excluded.role;
```

Only the `admin` role is supported; manager memberships are removed by the role migration and no longer pass `is_admin()`. After one administrator exists, an existing admin can grant or update another admin using `public.grant_admin_by_email(email, display_name, 'admin')`. The `20261004022511_final_admin_grant.sql` migration is the final override: it preserves an existing display name when the optional name is omitted and records the granting admin, target account, and action in `public.admin_role_audit_log`. Do not put admin emails in frontend code or expose a public admin-registration form.

Manual verification (run in the Supabase SQL Editor after applying the final grant migration):

```sql
select pg_get_functiondef('public.grant_admin_by_email(text,text,text)'::regprocedure);
```

Expected: the function definition does not allow the `manager` role and includes an insert into `public.admin_role_audit_log`.
