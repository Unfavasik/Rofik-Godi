# Customer Support ও Admin Activity Expansion Plan

## Product behavior

- Existing admin bell-এর full-page `/admin/activity` feed থাকবে; feed newest-first, cursor pagination-সহ older events load করবে, এবং realtime refresh-এ আগে load করা history হারাবে না। Adminরা order/status/payment, review, signup, support create/reply/status, product create/update/delete, profile update, coupon create/update/delete/redeem এবং campaign-sent activity দেখতে পারবে। Category filter/search এবং View action সংশ্লিষ্ট order, review, customer, support thread, product/coupon record বা campaign history-তে যাবে। Campaign composer `/admin/notifications`-এ আলাদা থাকবে।
- Customer `/support` ও `/support/:requestId` route-এ সব নিজের request, status, optional linked order, thread ও attachments দেখবে; ticket history-তে cursor pagination থাকবে, এবং recent page-এর বাইরে থাকা notification deep link-ও direct ticket fetch করে খুলবে। Thread newest 100 messages নিয়ে শুরু হবে; `Load older replies` keyset cursor-এ আগের conversation যোগ করবে।
- Customer reply দিলে resolved ticket reopen হবে। Admin reply/status change customer-কে in-app notification দেবে; notification-এর action ওই ticket খুলবে। Admin activity View একই ticket admin context-এ খুলে reply/status control দেবে।
- Contact modal-এর phone/WhatsApp এবং initial request flow বজায় থাকবে; নতুন ticket-এ কেবল নিজের order বেছে নেওয়া যাবে। সর্বোচ্চ ৩টি attachment, প্রতিটি ৫ MB, JPEG/PNG/WebP/PDF; storage private, short-lived signed URL only.

## Implementation ও data flow

- Supabase migration-এ support request-এ `related_order_id`, `last_message_at`, `attachment_count`, message thread, attachment metadata ও pagination index যোগ/ব্যাকফিল হবে। Customer/auth-admin narrow RPC দিয়ে reply/status কাজ হবে; message, notification ও activity একই transaction-এ লেখা হবে।
- Support request ও thread query RLS-এ customer-owned; admin check server-side। Customer order ownership RPC-তে পুনরায় যাচাই হবে। Private `support-attachments` bucket Storage RLS path `user_id/request_id/...` enforce করবে; owner/admin-ই read করতে পারবে। File name/path/MIME/size/count validate হবে.
- `/support` Account surface-এর routed page; `SupportCenter` cursor-paged ticket list, `SupportConversation` thread/attachments/replies, `CustomerSupportRequestForm` order/attachments/navigation পরিচালনা করবে। Conversation older cursor `(created_at,id)`; ticket list cursor `(last_message_at,id)`.
- `admin_activity_events` RPC `(created_at,id)` keyset cursor গ্রহণ করবে; first page 200, `Load older`-এ next page। Realtime refresh latest page refresh করে loaded older pages merge করবে। Search/filter loaded events-এর ওপর চলে.
- Product, profile, coupon database triggers এবং notification campaign insert transition-table trigger activity log করবে। Event details-এ প্রয়োজনীয় operational field থাকবে; order message/body sensitive text বা অপ্রয়োজনীয় PII audit details-এ কপি হবে না। Exact-record View campaign/product/coupon/orders/reviews-এর বিদ্যমান admin view-এ focus/scroll করবে; deleted entity-তে graceful fallback.
- Existing label/visual style এবং RLS বজায় থাকবে; browser bundle-এ Supabase secret/service role নয়.

## Project structure

- `src/lib/appRoutes.ts`, `public/manus-routes.json`, `src/App.tsx`: support routes/deep links.
- `src/components/SupportCenter.tsx`, `SupportConversation.tsx`, `CustomerSupportRequestForm.tsx`: customer request list, paged thread, private file display/upload.
- `src/components/AdminActivityView.tsx`, `AdminPanel.tsx`, `AdminProductManager.tsx`, `CouponManagement.tsx`, `AdminSections.tsx`: paged audit inbox and exact-record View.
- `src/lib/supabaseSupport.ts`, `src/lib/supabaseAdminActivity.ts`: owner/admin typed RPCs, cursor paging, private attachment helpers.
- `supabase/migrations`: thread, storage/RLS, message notifications, audit events, cursor feed.
- `tests`: support/auth/route/paging, file limits and event View coverage.

## Design

- **Movement:** Rofik Godi-এর clean, mobile-first operational CRM visual language.
- **Principles:** customer privacy/follow-up clarity; admin activity-to-record navigation; predictable history paging; file access default-private.
- **Palette/layout:** existing white/slate surfaces ও brand red accent; mobile full-screen support thread, desktop max-width conversation; event list timeline.
- **Interaction:** ticket list → conversation → reply; notification opens exact ticket; upload failure and send retry স্পষ্ট; pagination duplicate/skip ছাড়া.
- **Voice:** current concise English labels, যেমন “My support”, “Reply”, “Attach file”, “Load older replies”, “Load older activity”.

## সীমা ও assumptions

- Customer update এবং admin reply/status alert in-app only; email/SMS/push scope-এর বাইরে.
- Optional order link শুধু authenticated customer-এর own order; attachment limit ৩ files/ticket, ৫ MB/file, JPEG/PNG/WebP/PDF; public storage URL হবে না.
- External phone/WhatsApp কথোপকথন activity feed-এ capture করা যাবে না.


## Status and final verification

- The support lifecycle, audit coverage, customer note notifications, private attachments, keyset pagination and exact entity navigation are implemented.
- Four migrations are deployed to the connected Supabase project. The duplicate cursor index was removed; support foreign-key indexes and scalarized support read policies were added. The remaining database advisor notices are pre-existing project-wide findings; new support RPCs are not executable by `anon`.
- The UI keeps English labels with Bengali support/privacy guidance. Lint, 209 tests and the production build pass.
- Manual authenticated mobile inspection is still pending: the isolated preview sends `/support` to sign-up without a session, and the browser tool did not permit viewport resizing. No live customer data was created during the preview check.
- Current cleanup is best-effort in the client for failed/partial uploads and attachment RPC failures. There is no background sweep for abandoned uploads after a tab interruption; schedule one only if higher traffic warrants it.
