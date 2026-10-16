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
Continue the existing red/white Rofik Godi Centre mobile storefront design: clear compact typography, thumb-friendly actions, strong hierarchy, full-height mobile account/support pages and responsive desktop surfaces. Use the supplied notification/contact-support references as UI guidance. Keep all customer-facing copy in English as explicitly agreed; do not imply that language selection translates the interface.

## Guest, onboarding and authentication
- A fresh application load without an authenticated customer starts at the existing welcome carousel. The completion flag exists only in React memory—never in localStorage or sessionStorage—so every fresh open/reload without login shows the carousel again.
- Finishing the carousel enters guest browsing for the remainder of that mounted app session. Public catalog, product, search, cart, wishlist and general account/settings surfaces remain available without creating an account.
- Checkout/Buy Now, order history and private support routes are protected. A guest is shown a login-required prompt before private data or checkout; closing it returns to safe guest browsing.
- New customers follow the dedicated Rofik signup onboarding before the signup form. Existing customers can choose direct sign-in. After authentication, resume the protected destination or the pending checkout/Buy Now action.
- Admin access remains governed by the existing role-resolution and protected-workspace logic.

## Functional customer settings
- `src/lib/customerPreferences.ts` stores safe, versioned preferences per customer/device identity. Notification switches filter the actual in-app category feed and unread badge; the UI explicitly does not promise push/WhatsApp delivery.
- Language choice is persisted, but the interface remains English. Haptic feedback is persisted and produces a brief vibration only on browsers that expose the Vibration API.
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
The guest onboarding/auth gate, persistent functional settings, product/notification/support pages, notification gesture controls and admin order route are implemented in the current repository. The public preview serves the app; the welcome carousel was visually confirmed at the unauthenticated entry route. A real customer signup/sign-in/checkout round trip still requires an authorized test account and has not been exercised in the isolated preview.
