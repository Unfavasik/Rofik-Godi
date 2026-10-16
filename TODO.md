# TODO

## Customer profile route and navigation

- [x] `/admin/Customers`-এ customer row-এর Eye action tap করলে selected customer-এর `/admin/customers/:customerId` profile route খুলবে; profile direct route-এও customer id থেকে render হবে; one clear action Customers list-এ ফিরবে।
- [x] Profile-এ mockup-এর customer identity/contact, summary metrics, এবং Order history / Details / Notes views থাকবে; customer ও order values বিদ্যমান account data থেকে আসবে, hard-coded sample data নয়।

## Customer profile UI and data

- [x] Customer identity-তে actual name, email, phone, avatar/initials ও returning/new status দেখাবে; unavailable field-এ safe empty state দেখাবে।
- [x] Summary-তে order count, lifetime spending, customer-since date ও status থাকবে; Details view-তে account fields এবং order insights actual loaded orders থেকে হিসাব করে দেখাবে।
- [x] Order history-তে matching customer-এর actual order number, date, status, amount, saved product thumbnails/items, empty state, এবং existing order-open action থাকবে।
- [x] Notes view-তে customer অনুযায়ী scoped Important, Delivery, Payment, Call ও General notes যোগ/দেখা/মুছা যায়; existing admin-only storage policy থাকে।
- [x] Profile page mobile ও desktop-এ readable/responsive এবং user-provided mockups-এর hierarchy অনুসরণ করে।
- [x] Admin-only data boundary অক্ষুণ্ণ; customer profile email/name/phone update permission বা migration যোগ করা হয় না।

## Screenshot-driven header polish

- [x] Customer detail route-এ top bar-এর `Admin / Customers / Profile` breadcrumb সরানো এবং global title `Customers` রাখা; main profile content-এ `Customer profile` একবারই দেখানো।
- [x] Name-এর পাশে `Returning customer` badge ও avatar-এর decorative green dot সরানো; customer status summary tile-এ থাকে।
- [x] Customers-এ ফেরার জন্য একটি মাত্র clear back action রাখা।

## Customer notification delivery

- [x] Existing secure admin RPC target customer-এর in-app notification row তৈরি করে; persisted notification expiry সাত দিন এবং row-level security customer-কে শুধু নিজের notification দেখায়। SMS, email ও push বর্তমানে supported নয়।
- [x] Notifications table Supabase Realtime-এ publish করা; logged-in customer-এর নিজস্ব `user_id` filter-সহ inbox ও unread-count update হয়।
- [x] User choice 2 অনুযায়ী প্রতিটি **নতুন** profile note save হওয়ার সঙ্গে একই transaction-এ একই customer-এর in-app notification-এ exact note text পাঠানো হয়; note ID retry-safe/idempotent।
- [x] পুরোনো team-only notes retroactively পাঠানো হয় না; profile UI-তে `Team-only`/`Sent to customer` status, automatic-send disclosure, ও delivery failure message দেখা যায়। Note মুছলে ইতিমধ্যে পাঠানো notification ফেরত নেওয়া হয় না—UI-তে সেটি স্পষ্ট।

## Verification

- [x] `pnpm lint`, full test suite (26 files / 193 tests) এবং `pnpm build` pass করেছে।
- [x] Live Supabase metadata: atomic RPC exists; authenticated execute=true, anonymous execute=false; notifications Realtime enabled; notifications RLS remains enabled।
- [x] Local ও public `/admin` preview HTTP 200; no test/customer notification পাঠানো হয়নি।
- [x] `.env.local` Git ignore-এ; Supabase secret key client bundle বা commit-এ নেই.
