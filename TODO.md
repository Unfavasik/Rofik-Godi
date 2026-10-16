# TODO

## Delivered and verified

- [x] Customer profile uses a clean layout without duplicate breadcrumb/status/avatar-dot elements; existing profile and order data remain connected.
- [x] Every admin customer note sends the customer an in-app notification.
- [x] Admin Activity is a full-page feed with filters/search, per-admin read state, realtime refresh, keyset pagination, and exact-record View actions.
- [x] Audit coverage includes orders, reviews, customers/profile updates, support, products, coupons and notification campaigns.
- [x] Customer Support supports private ticket history, threaded replies, optional own-order linkage, notification deep links, and real-time updates.
- [x] Attachments accept JPEG/PNG/WebP/PDF, at most 3 files per ticket and 5 MB each; storage is private with signed URLs and server-side ownership/size/count checks.
- [x] Failed/partial uploads and attachment RPC failures trigger best-effort client cleanup; attachment counts are server-maintained and backfilled.
- [x] Four support/audit/index migrations are applied to the connected Supabase project; policies and function grants were checked, and the duplicate feed index was removed.
- [x] English remains the primary UI language; support privacy/payment-safety instructions include Bengali guidance.
- [x] `pnpm lint`, `pnpm test` (209/209), and `pnpm build` pass.

## Remaining manual or scale-dependent checks

- [ ] Logged-in mobile visual smoke test: the isolated preview redirects `/support` to onboarding/sign-up without an authenticated session, and its browser viewport could not be changed from 1280×1100. No customer data was entered or created.
- [ ] If high traffic or frequent abandoned uploads are expected, add an operational orphan-object sweeper. Current client code removes files on upload/RPC failures, but there is no scheduled sweep for a browser/tab interruption between storage upload and metadata attachment.
