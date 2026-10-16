# Admin Activity Feed ও Support Request Plan

## উদ্দেশ্য

Admin dashboard-এর bell আর ছোট notification card/dropdown খুলবে না; সেটি full-page `/admin/activity` feed খুলবে। Feed-এ কে কী করেছে, কখন করেছে, সংশ্লিষ্ট entity-র তথ্য এবং পরিষ্কার **View** action থাকবে। নতুন order-এর **View** Admin Orders section-এ সেই exact order details খুলবে। নতুন in-app support request admin-কে দেখাবে এবং সেই request-এর বিস্তারিত খুলবে। Existing `/admin/notifications` customer campaign composer আলাদা থাকবে।

## বাস্তবায়ন ও data flow

- **Activity event store:** admin-only `admin_activity_events` table-এ order create, order status/payment change, product review create, customer profile create এবং support request create events রাখা হবে। Database triggers/business RPC event লিখবে, তাই feed real records থেকে আসবে; client-side fabricated notification হবে না।
- **Read state/security:** প্রতিটি admin-এর read state `admin_activity_event_reads`-এ per-admin সংরক্ষিত হবে; একটি admin-এর read action অন্য admin-এর unread count মুছবে না। RLS/admin-checked RPC event list, counts ও read changes নিয়ন্ত্রণ করবে। Authenticated admin-only Realtime subscription নতুন activity-তে feed ও bell badge refresh করবে।
- **Full page/navigation:** Admin bell click করলে `/admin/activity`-এ যাবে; sidebar-এ “Notifications” entry থাকবে এবং পুরোনো campaign composer “Campaigns” নামে আলাদা থাকবে। Responsive feed-এ All / Orders / Support / Reviews / Customers filters, search, unread/read state, event time, user identity ও entity-specific details থাকবে। “Mark all read” থাকবে; feed সর্বশেষ 200টি event পর্যন্ত দেখায়।
- **Order details:** Order event-এ customer name/phone, order number, items/quantities, total, order/payment status এবং created/updated time থাকবে। View action existing Admin Orders route ও `AdminOrderDetails` modal-এ ওই order খুলবে।
- **Review details:** Review event-এ author, product, rating, comment এবং publication state থাকবে। View সংশ্লিষ্ট review entry-তে নিয়ে যাবে/focus করবে।
- **Support requests:** বর্তমান Contact modal-এর Call ও WhatsApp option থাকবে; সঙ্গে signed-in customer-এর জন্য category, subject ও message (১০–২০০০ characters) form যোগ হবে। Secure RPC authenticated user ID থেকে request সংরক্ষণ করবে; success state ticket reference দেখাবে। Admin feed-এ customer identity/contact, category, subject, full message ও Open/In progress/Resolved status দেখাবে; View request detail খুলবে এবং admin secure RPC দিয়ে status বদলাতে পারবে। Phone/WhatsApp-এর off-app কথোপকথন track করা হবে না।
- **Existing messaging:** `/admin/notifications` customer-facing campaign send/history বজায় রাখবে, কিন্তু admin shell-এ “Campaigns” নামে দেখাবে। Admin activity feed customer inbox notification delivery channel নয়; এটি internal admin event feed।
- **No secrets/client authority:** Supabase service/secret key কখনও browser bundle-এ যাবে না; browser শুধু publishable key এবং authenticated session ব্যবহার করবে। Orders, reviews, profiles, tickets ও activity-র existing RLS অক্ষুণ্ণ থাকবে; নতুন data access কেবল narrow admin/customer RPC policy দিয়ে হবে।

## Project structure

- `src/lib/appRoutes.ts`, `public/manus-routes.json`: `/admin/activity` route declaration.
- `src/components/AdminPanel.tsx`: bell navigation, unread badge, activity realtime subscription, existing order modal bridge.
- `src/components/AdminActivityView.tsx`: searchable/filterable full-page feed, event cards, order/review/support View flows.
- `src/components/SettingsView.tsx` + `src/lib/supabaseCustomer.ts`: customer support request form and authenticated create RPC wrapper.
- `src/lib/supabaseAdminActivity.ts`: typed admin event/support helpers and RPC calls.
- `supabase/migrations`: support-request and admin-event schemas, triggers, RLS and narrow security-definer RPCs.
- `tests`: activity helpers, route/title, support form and View-action regression coverage.

## Design

- **Movement:** Rofik Godi admin-এর existing clean, mobile-first operational CRM visual language.
- **Principles:** (১) নতুন activity চোখে পড়ে কিন্তু ভিড় করে না; (২) event-specific তথ্য পড়া যায়; (৩) View থেকে সরাসরি record-এ যাওয়া যায়; (৪) private customer data কেবল অনুমোদিত admin-কে দেখানো হয়।
- **Palette/layout:** existing white/slate surfaces, Rofik Godi red accent, semantic amber/blue/green status; desktop-এ timeline/list, mobile-এ stacked event cards, detail drawer/modal.
- **Interaction:** bell→full page, live unread badge, compact filters, event-specific CTA, one-tap mark read, clear support submission/success/errors.
- **Typography/brand voice:** existing Tailwind sans stack; short direct English UI labels consistent with the current admin app.

## সীমা

In-app support submit করতে customer-কে signed in থাকতে হবে; guest contact-এর জন্য existing call/WhatsApp থাকবে। Feed order, status/payment, review, profile এবং in-app support events অন্তর্ভুক্ত করবে; phone/WhatsApp chat app-এর বাইরে, তাই সেগুলো থেকে event তৈরি করা যাবে না। কোনো test support ticket/customer record তৈরি করা হবে না।
