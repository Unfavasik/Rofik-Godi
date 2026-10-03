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
pnpm test       # Checkout/coupon calculation tests
pnpm build
pnpm format
```

## Supabase

Apply migrations in `supabase/migrations/` in order. The catalog migration keeps `is_active` (publication) separate from `in_stock` (availability), adds atomic gallery replacement, and provides the admin customer summary RPC. Product images are converted to WebP and uploaded to the `product-images` Storage bucket.
