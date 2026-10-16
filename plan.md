# Customer Profile UI Plan

## উদ্দেশ্য

`/admin/customers/:customerId` route অক্ষুণ্ণ রেখে Customers list-এর eye action থেকে responsive Customer Profile দেখানো। UI screenshot/mockup-এর hierarchy বজায় রাখবে, কিন্তু duplicate title/breadcrumb ও decorative status marker ছাড়া; customer/order/product values বাস্তব store data থেকে আসবে।

## বাস্তবায়ন ও data flow

- Customer route এবং eye navigation আগের মতো থাকবে; profile page `AdminCustomerProfile` component-এ render হবে। Summary, avatar, loaded order history ও product images existing Supabase loaders থেকে আসবে।
- Profile-এ summary cards এবং Order history / Details / Notes tabs থাকবে। Global shell-এ `Customers` context title, profile content-এ মাত্র একবার `Customer profile` heading থাকবে; avatar-এর green dot ও beside-name `Returning customer` badge থাকবে না। Returning/new status metrics/details-এ থাকবে।
- Existing admin notes `app_settings`-এর admin-only RLS row-তে customer-id অনুযায়ী JSON হিসেবে থাকে। User-এর explicit choice অনুযায়ী **প্রতিটি নতুন note save হওয়ার সময় একই transaction-এ একই customer-এর inbox-এ exact note text in-app notification হিসেবে যাবে**। New note-এ customer notification timestamp থাকবে; পুরোনো notes-কে retroactively পাঠানো হবে না, সেগুলো `Team-only` হিসেবে চিহ্নিত থাকবে।
- Note+notification write secure admin-only RPC দিয়ে atomic ও note-ID idempotent হবে; failure হলে note success দেখানো হবে না। RPC existing `is_admin()` check করবে, customer ID ও note input validate করবে, এবং notification সাত দিনের expiry পাবে।
- Notifications table Supabase Realtime publication-এ আছে; client শুধু authenticated user's `user_id` filter-এ insert event নেবে; existing RLS policies অপরিবর্তিত থাকবে। Foreground app-এ inbox ও unread count refresh হবে; app বন্ধ থাকলে notification persisted থাকবে এবং পরে খুললে inbox-এ দেখা যাবে।
- Delivery channel **in-app only**; এই project-এ SMS, email বা OS/browser push নেই। Admin note remove করলে ইতিমধ্যে পাঠানো customer notification retract হবে না; UI-তে সেটি স্পষ্ট থাকবে। কোনো test/customer notification পাঠানো হবে না।
- Account name/email/phone read-only; বিদ্যমান admin policy profile update অনুমোদন করে না। নতুন profile permission বা route প্রয়োজন নেই। Supabase secret key client bundle-এ যাবে না।

## Project files

- `src/components/AdminPanel.tsx`: admin shell title ও route state.
- `src/components/AdminCustomerProfile.tsx`: profile, orders, details, notes UI.
- `src/lib/supabaseAdmin.ts`: secure admin RPC wrappers.
- `src/App.tsx` এবং `src/components/NotificationsView.tsx`: user-scoped notification realtime subscriptions.
- `supabase/migrations`: notification publication এবং note+notification atomic RPC.
- `tests/adminCustomerProfile.test.tsx`, `tests/adminPanel.test.tsx`, `tests/adminNotifications.test.tsx`: profile, route ও RPC behavior.

## Design

- **Design movement:** clean, mobile-first commerce-admin CRM; quick to scan and operationally trustworthy.
- **Color:** Rofik Godi red accent `#D9232D`; restrained blue profile surfaces; semantic KPI/category colors.
- **Layout:** prominent profile hero, four compact metric tiles, segmented tabs, and responsive content cards.
- **Signature elements:** customer avatar/initials, rounded metric tiles, keyboard-operable pill tabs, category chips, visible “sent to customer”/“team-only” note badges.
- **Interaction:** route-backed back action, existing order-open behavior, explicit customer-visible note disclosure, note auto-send only when the admin adds it, and clear send/save failures.
- **Typography/brand:** existing Tailwind sans stack and Rofik Godi identity retained; short English UI copy.

## Scope / constraints

No customer account changes, broad permission changes, direct notification tests, or SMS/email/push integrations. The only DB changes are user-scoped notification Realtime publication and an admin-checked atomic RPC; existing notification/profile RLS policies remain unchanged. User-authored note content is customer-visible on creation as explicitly requested. Profile edits remain read-only under current policy.
