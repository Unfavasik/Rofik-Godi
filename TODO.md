# TODO

## Admin notification and support activity inbox

- [x] Admin bell এবং sidebar-এর **Notifications** link full-page `/admin/activity` feed খোলে; ছোট dropdown নেই; deep link/refresh কাজ করে।
- [x] Feed database থেকে নতুন ও সাম্প্রতিক order, order status/payment change, customer signup, product review, coupon redemption, support request এবং support-status changes দেখায়।
- [x] Event cards-এ actor/customer identity, contact, timestamp ও entity-specific details—order number/items/amount/payment/status, review product/rating/text, support category/subject/full message—দেখায়।
- [x] All/Orders/Support/Reviews/Customers filters, search, unread-only, per-admin read state, Mark all read, realtime refresh এবং latest events feed আছে।
- [x] Order View exact order details modal খোলে; Review View exact review filter করে; Customer View profile খোলে; Support View full ticket এবং Open/In progress/Resolved status control খোলে।
- [x] Existing `/admin/notifications` campaign composer/history আলাদা **Campaigns** page হিসেবে অক্ষুণ্ণ আছে।

## In-app customer support requests

- [x] Contact modal-এ signed-in customer-এর category/subject/message form, safe content limits, clear success ticket reference ও retryable error আছে; phone/WhatsApp options থাকে; guest-কে sign-in করতে বলা হয়।
- [x] Authenticated session থেকে server-side request creator `user_id` নেয়; ticket RLS customer/admin-limited; admin-only status/update path narrow RPC দিয়ে সুরক্ষিত।
- [x] Ticket create/status change admin activity event-এ record হয়; test ticket বা customer notification পাঠানো হয়নি।

## Security and delivery

- [x] Activity/read-state tables RLS-enabled; admin feed/read/status RPCs authenticated-only grant සහ server-side admin check রাখে; anonymous execute নেই।
- [x] Support/activity migration target Supabase project-এ applied; `admin_activity_events` Realtime publication-এ যুক্ত; recent real activity backfilled এবং historical events current admins-এর জন্য read হিসেবে mark করা।
- [x] `pnpm lint`, `pnpm test` (28 files / 202 tests) এবং `pnpm build` pass করেছে।
- [x] `.env.local` Git ignore-এ; service secret client bundle বা commit-এ নেই.
