# Project outcomes

## Product catalogue and new-arrival notification

- [x] Product listing cards use a compact, aligned hierarchy with real catalog prices/stock and do not invent ratings or discounts; long titles are clamped without hiding key data.
- [x] New-product notification details resolve the announced live catalog product and show its actual images, price, availability and product details in the supplied mobile mockup style.

## Admin product photo details

- [x] In Add product > Product details, Gemini analyzes the uploaded primary colour image through the admin-authenticated Supabase Edge Function and drafts subtitle, features, materials and stitch patterns. It sets the standard package/installation defaults, keeps every field editable, and avoids downloading or running an image model in the browser.

## Admin order details

- [x] Admin order details have a direct `/admin/orders/:orderId` route supporting database IDs and public order numbers; the order ID sits beneath the page title and redundant store branding/duplicate completed states are removed.

## Customer notifications and support

- [x] Notification inbox supports All, Orders, Offers, Support and System categories derived from actual notification payloads; opening a support reply shows real ticket metadata/latest staff reply and opens the same private conversation.
- [x] `/contact-support` provides the reference-style support form using the authenticated support workflow, real customer order choices and existing message/attachment limits.
- [x] My Support, support detail and Contact Support render as full-height pages without the persistent account tab bar; the mobile ticket list is an edge-to-edge page rather than a nested oversized card.
- [x] Notification delete is revealed by press-and-hold or swipe-left; swipe-right/tap closes it, ordinary tap opens details, and keyboard focus exposes the accessible delete control.

## Order-specific Help & Support

- [x] In `/my-order/order/:orderSlug`, the bottom `Need help?` action opens the supplied Help & Support-style page with the real order summary, status, order item image, support topics, phone, WhatsApp and store links.
- [x] Every Help & Support topic and `Live Chat` action opens `/contact-support` and preselects the originating customer-owned order, while the existing Supabase support RPC, private thread, attachment limits and RLS remain the source of truth.

## Guest onboarding and authentication flow

- [x] On every fresh app open/reload without an authenticated session, show the welcome onboarding (no persisted “seen” flag). After finishing it, allow guest browsing for the rest of that app session instead of forcing account creation; public shop/product/search/cart/wishlist/account/settings surfaces remain available.
- [x] Guest checkout/Buy Now, order history and private support routes request authentication before private data or checkout is shown. Create-account goes through Rofik signup onboarding then signup; existing customers can choose direct sign-in. Successful auth resumes the protected destination or pending checkout; dismissing the prompt returns safely to guest browsing.

## Functional settings

- [x] Notification preferences persist per account/guest device and filter the actual in-app All/Orders/Offers/Support/System feed and unread badge. UI does not claim unimplemented push or WhatsApp delivery.
- [x] English/Bangla/Hindi preference and haptic switch persist. English remains primary; the UI switches to Bangla on the supported customer surfaces, Hindi falls back to English with a clear note, and haptics work where supported.
- [x] Settings Reviews opens the existing verified-purchase order flow instead of fake success. Other settings actions remain connected to real routes/actions, and coupon-copy failures are reported truthfully.

## Validation and limitation

- [x] `pnpm lint`, `pnpm test` (237 tests), `pnpm build`, `git diff --check`, local/public preview HTTP checks and the route-manifest check pass; unauthenticated preview visually opens the welcome carousel.
- [ ] A real signup/sign-in plus resumed checkout/order route needs an authorized customer test session; it was not submitted or simulated in the isolated preview.

## Phase 1 — Customer order cancellation

- [x] In My Orders/order details, show **Cancel order** only while status is `NEW` (or the earliest unconfirmed state) and payment is not paid. Use `ConfirmDialog` with an optional reason.
- [x] Call a new `SECURITY DEFINER` RPC `cancel_my_order(p_order_number, p_reason)` that checks `auth.uid()` owns the order and server-side status/payment permit cancellation; set `CANCELLED`, invalidate pickup QR token using the existing terminal-status logic, create an admin notification, and return clear errors. Update the UI only after RPC success; test allowed and blocked cases.

## Phase 2 — Order timeline and ready notification

- [x] Order details show a vertical real-status timeline: Placed, Confirmed, Ready for pickup, Completed; show timestamps only where available, and show Cancelled as its own state.
- [x] When an admin transitions an order into ready-for-pickup, create a customer notification in the existing notifications table/realtime flow that opens that order.

## Phase 3 — Reorder / Buy again

- [x] Completed orders offer **Buy again**; add order items with the same available color, thickness, stitch and embroidery text, but use current catalog prices and stock through `refreshCartFromCatalog`. Skip inactive/out-of-stock items, tell the customer which were skipped, then open the cart.

## Phase 4 — Stock awareness and alerts

- [x] The existing schema contains `stock_quantity` and `low_stock_threshold`; map them to catalog products and show **Only N left** at/below the threshold. Out-of-stock products offer **Notify me** instead of Add to cart, including from product details.
- [x] Guests who select Notify me are asked to sign in through `LoginRequiredModal` and the alert resumes after customer auth. A new migration adds unique owner-scoped `stock_alerts` with RLS, an auth/product/status-checked RPC, and a server trigger that notifies customers when a product becomes active and in stock, then deletes fulfilled alert rows.
- [x] Phase 4 validation: `pnpm exec tsc --noEmit`, `pnpm test` (273 tests), `pnpm build`, and `git diff --check` pass.

Do not start a later phase until the current phase's implementation, TypeScript check and existing tests have completed.

## Phase 5 — PWA install prompt

- [x] Capture and share `beforeinstallprompt`; show a small dismissible Install app card on Home and Account > Settings, with iOS Safari Share → Add to Home Screen guidance when needed.
- [x] Hide when installed or in standalone mode; persist dismissals for 14 days using guarded localStorage; cover install-state and card behavior with tests.
- [x] Phase 5 validation: `pnpm exec tsc --noEmit`, `pnpm test` (279 tests), `pnpm build` (including manifest/service worker), and `git diff --check` pass.

## Phase 6 — Bangla language support

- [x] Add typed English/Bangla dictionaries and fallback-to-English behavior; Hindi preference remains English with the existing untranslated note.
- [x] Translate bottom navigation, Home headings, product-card labels, cart, checkout, order statuses/timelines, Account menu, Settings, PWA install hints and order notifications using simple West Bengal Bengali.
- [x] Format ₹ values with Indian digit grouping and cover interpolation/fallback with tests; at 360px in Bangla, the storefront has no horizontal overflow and the install controls remain 44px high.
- [x] Phase 6 validation: `pnpm exec tsc --noEmit`, `pnpm test` (283 tests), `pnpm build`, `git diff --check`, and local/public production-preview HTTP checks pass. The unauthenticated preview opens onboarding and proceeds into the guest storefront.

## Phase 7 — Compare products and admin CSV export

- [ ] Deferred at the user's request: product cards support a maximum of 3 comparisons; sticky count bar opens a side-by-side sheet with price, material, waterproofing, compatibility, thickness options and live stock.
- [ ] Admin Reports exports orders for the selected date range through the existing admin-only data source; CSV escapes delimiters/quotes/newlines and neutralizes `=`, `+`, `-`, `@` formula prefixes.

## Cross-phase quality

- [ ] Preserve red (#D9232D), rounded cards and bottom navigation; keep targets ≥44px, dark-text contrast AA and accessible labels on icon buttons.
- [ ] Add loading, empty and error states; disable in-flight actions and use ref locks for double taps; add or update regression tests in `tests/`.
