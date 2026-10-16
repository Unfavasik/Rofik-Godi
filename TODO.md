# Project outcomes

## Product catalogue and new-arrival notification
- [x] Product listing cards use a compact, aligned hierarchy with real catalog prices/stock and do not invent ratings or discounts; long titles are clamped without hiding key data.
- [x] New-product notification details resolve the announced live catalog product and show its actual images, price, availability and product details in the supplied mobile mockup style.

## Admin order details
- [x] Admin order details have a direct `/admin/orders/:orderId` route supporting database IDs and public order numbers; the order ID sits beneath the page title and redundant store branding/duplicate completed states are removed.

## Customer notifications and support
- [x] Notification inbox supports All, Orders, Offers, Support and System categories derived from actual notification payloads; opening a support reply shows real ticket metadata/latest staff reply and opens the same private conversation.
- [x] `/contact-support` provides the reference-style support form using the authenticated support workflow, real customer order choices and existing message/attachment limits.
- [x] My Support, support detail and Contact Support render as full-height pages without the persistent account tab bar; the mobile ticket list is an edge-to-edge page rather than a nested oversized card.
- [x] Notification delete is revealed by press-and-hold or swipe-left; swipe-right/tap closes it, ordinary tap opens details, and keyboard focus exposes the accessible delete control.

## Guest onboarding and authentication flow
- [x] On every fresh app open/reload without an authenticated session, show the welcome onboarding (no persisted “seen” flag). After finishing it, allow guest browsing for the rest of that app session instead of forcing account creation; public shop/product/search/cart/wishlist/account/settings surfaces remain available.
- [x] Guest checkout/Buy Now, order history and private support routes request authentication before private data or checkout is shown. Create-account goes through Rofik signup onboarding then signup; existing customers can choose direct sign-in. Successful auth resumes the protected destination or pending checkout; dismissing the prompt returns safely to guest browsing.

## Functional settings
- [x] Notification preferences persist per account/guest device and filter the actual in-app All/Orders/Offers/Support/System feed and unread badge. UI does not claim unimplemented push or WhatsApp delivery.
- [x] English/Bangla/Hindi preference and haptic switch persist. UI remains English with that limitation stated; the haptic switch vibrates briefly on supported browsers and is silent when unsupported.
- [x] Settings Reviews opens the existing verified-purchase order flow instead of fake success. Other settings actions remain connected to real routes/actions, and coupon-copy failures are reported truthfully.

## Validation and limitation
- [x] `pnpm lint`, `pnpm test` (237 tests), `pnpm build`, `git diff --check`, local/public preview HTTP checks and the route-manifest check pass; unauthenticated preview visually opens the welcome carousel.
- [ ] A real signup/sign-in plus resumed checkout/order route needs an authorized customer test session; it was not submitted or simulated in the isolated preview.
