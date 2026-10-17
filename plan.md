# Rofik Godi Centre — Product and Implementation Plan

## Product
Mobile-first storefront and customer account experience for Rofik Godi Centre. Customers can browse real seat-cover products, save items, request support, receive account notifications and place orders. Admin staff manage catalog, orders and customer support through protected admin screens.

## Existing project structure
- `src/App.tsx` owns route-to-view state, auth orchestration, customer navigation, cart/checkout and global app interactions.
- `src/components/` contains the storefront, onboarding/auth, customer account/settings, notifications/support, product/order detail and admin UI.
- `src/hooks/` owns reusable auth, cart and catalog state.
- `src/lib/` contains route parsing, customer/admin API helpers, Supabase access, product review/support/order workflows and preference utilities.
- `src/data/` holds product/filter and workshop presentation constants; the catalog itself is hydrated from the existing data service.
- `supabase/migrations/` is the source of schema, security policies and server-side workflows; customer-visible order, ticket, review and notification data must come from authorized live queries, not promotional placeholders.
- `public/manus-routes.json` declares directly addressable website routes; `tests/` contains Vitest regression coverage.

## Design direction
Continue the existing red/white Rofik Godi Centre mobile storefront design: clear compact typography, thumb-friendly actions, strong hierarchy, full-height mobile account/support pages and responsive desktop surfaces. Use the supplied notification/contact-support references as UI guidance. Keep English as the primary UI language while adding an optional Bangla toggle; Hindi remains an English fallback until translated.

## Guest, onboarding and authentication
- A fresh application load without an authenticated customer starts at the existing welcome carousel. The completion flag exists only in React memory—never in localStorage or sessionStorage—so every fresh open/reload without login shows the carousel again.
- Finishing the carousel enters guest browsing for the remainder of that mounted app session. Public catalog, product, search, cart, wishlist and general account/settings surfaces remain available without creating an account.
- Checkout/Buy Now, order history and private support routes are protected. A guest is shown a login-required prompt before private data or checkout; closing it returns to safe guest browsing.
- New customers follow the dedicated Rofik signup onboarding before the signup form. Existing customers can choose direct sign-in. After authentication, resume the protected destination or the pending checkout/Buy Now action.
- Admin access remains governed by the existing role-resolution and protected-workspace logic.

## Functional customer settings
- `src/lib/customerPreferences.ts` stores safe, versioned preferences per customer/device identity. Notification switches filter the actual in-app category feed and unread badge; the UI explicitly does not promise push/WhatsApp delivery.
- Language choice is persisted. English remains the primary language; the typed Phase 6 dictionaries add Bangla for navigation, Home, product cards, cart, checkout, order details/statuses, account/settings, PWA install and order notifications, while Hindi falls back to English. Rupee values use Indian digit grouping. Haptic feedback is persisted and produces a brief vibration only on browsers that expose the Vibration API.
- Settings review action opens the existing order-history/verified-purchase review flow; never report a review as submitted unless the actual verified review workflow completes.
- Coupon copy uses the clipboard API/fallback and shows a truthful failure message. Existing policy, terms, contact, help, store and logout actions remain connected to their real routes/actions.

## Customer notification and support surfaces
- Product arrival detail is associated with the real active catalog item and uses the product's actual images, price, stock and descriptions.
- Notification categories are derived from the real notification payload. Support replies open the actual private ticket and render real ticket status, category, submission time and latest staff message.
- `/contact-support` reuses the authenticated support request/RPC flow and its existing limits/attachments. `/support` and ticket details are full-height routes without the persistent account tab bar; the mobile ticket list is an edge-to-edge page, not a nested oversized card.
- Notification deletion is a separate accessible action revealed by press-and-hold or swipe-left. Swipe-right/tap closes the tray; ordinary tap opens the notification. Keyboard focus can reveal the delete control.

## Admin order details
- Admin order detail is directly addressable by public order number or database identifier at `/admin/orders/:orderId`.
- Remove redundant store branding and duplicated “Order completed” cards; show the actual order identifier beneath the title and preserve a single clear invoice/action state.

## Data and security constraints
- Continue using the existing Supabase client and current RLS/RPC contracts. Browser code must never use the privileged Supabase secret key.
- Never fabricate review counts, store ratings, support replies, order details or catalog availability. Private data remains behind the authenticated customer/admin paths already used by the project.
- Local settings may fall back to in-memory defaults if browser storage is unavailable; this must not block storefront use.

## Current delivery status
The guest onboarding/auth gate, persistent functional settings, product/notification/support pages, notification gesture controls and admin order route are implemented. Phases 1–6 are now implemented: customer cancellation, a real-status timeline and ready-for-pickup notification, current-catalog Buy again, stock-aware availability/restock alerts, PWA install prompt, and English-primary Bangla UI with Hindi-to-English fallback. TypeScript checks, all 283 tests, production build, `git diff --check`, and local/public preview HTTP checks pass. The preview was visually opened at onboarding and advanced into the guest storefront. Phase 7 (product comparison and admin CSV export) remains pending at the user's request. A real customer signup/sign-in/checkout/restock-alert round trip still requires an authorized test account and has not been exercised in the isolated preview.


## Requested order and stock enhancements
- **Phase 1 — Customer cancellation:** Extend the existing customer order details flow and `src/lib/supabaseOrders.ts` with a call to a new timestamped migration RPC. The database function is the authority for ownership, unpaid status and cancellable state; it atomically marks the order cancelled, invalidates its pickup token using the established terminal-state convention, and records an admin notification. Keep the customer flow in the existing `CustomerOrdersModal`/order-detail surfaces and use the existing `ConfirmDialog` style with an optional reason. Refresh or update displayed data only after RPC success.
- **Phase 2 — Order timeline/readiness:** Adapt the current order progress UI in `src/components/CustomerOrdersModal.tsx` to a vertical Placed → Confirmed → Ready for pickup → Completed timeline, preserving actual order statuses and only showing timestamps backed by stored fields. Add readiness notification at the existing admin-to-customer status boundary or a database trigger so it is emitted on the transition into READY_FOR_PICKUP, reusing `notifications` and the current order route.
- **Phase 3 — Reorder:** Reuse the cart helpers and `refreshCartFromCatalog` in `src/App.tsx`/`src/lib/cart.ts` to rebuild completed order items from current catalog data, preserve color/thickness/stitch/embroidery choices, skip inactive or unavailable products, report skipped items, and open the cart.
- **Phase 4 — Stock awareness:** Inspect the existing product schema before rendering counts; use `stock_quantity` only if already present, otherwise retain binary availability. Change out-of-stock add actions to the authenticated stock-alert path, with guest gating through `LoginRequiredModal`. Add a new timestamped migration for `stock_alerts`, owner-only RLS and uniqueness, plus a server-side back-in-stock notification trigger that removes fulfilled alerts.

Across phases, preserve the established mobile-first red `#D9232D` design, rounded cards and bottom navigation. All schema/security work belongs in new 14-digit timestamped migrations with RLS and server-side identity/state checks; never trust client prices, statuses or order ownership. Complete and validate one phase before starting the next, then run the existing tests and TypeScript check as requested.

## Phases 5–7 added by the user

### Phase 5 — PWA install prompt
- Capture `beforeinstallprompt` once at app level and make the deferred prompt available on Home and Account > Settings.
- Offer a compact, dismissible install card; on iOS Safari show Share → Add to Home Screen guidance when a native prompt is unavailable.
- Detect standalone/already-installed mode and hide the card. Persist dismissal with a 14-day expiry; guard all localStorage reads/writes.

### Phase 6 — Bangla UI
- Implement typed, lightweight English/Bangla dictionaries. Hindi remains a preference but intentionally falls back to English until translated.
- Translate bottom navigation, Home headings, product-card labels, cart, checkout, order statuses, Account menu and Settings.
- Use simple West Bengal Bengali, preserve INR/Indian grouping, fall back to English for missing keys, and keep controls readable at 360px.

### Phase 7 — Product comparison and admin CSV
- Allow selection of at most three products and show a sticky comparison bar opening a side-by-side sheet.
- Compare price, material, waterproofing, compatibility, thickness choices and live stock.
- Add date-range CSV export to Admin Reports through the existing admin-only order data source. Escape CSV syntax and neutralize spreadsheet formula prefixes.

### Cross-phase quality constraints
Preserve the existing red (#D9232D), rounded-card and bottom-navigation design. Keep touch targets at least 44px, maintain AA contrast for dark text, label icon-only controls, handle loading/empty/error states, disable in-flight actions and use ref locks for double-tap-sensitive requests. Add or update regression tests in `tests/`. Implement and validate one phase at a time.
