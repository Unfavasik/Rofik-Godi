# TODO

## Customer profile route and navigation

- [x] `/admin/Customers`-এ customer row-এর Eye action tap করলে selected customer-এর `/admin/customers/:customerId` profile route খুলবে; profile direct route-এও customer id থেকে render হবে; back action Customers list-এ ফিরবে।
- [x] Profile-এ mockup-এ দেখা “Customer profile” heading, customer identity/contact, customer status, summary metrics, এবং তিনটি Order history / Details / Notes view থাকবে; customer ও order values বিদ্যমান account data থেকে আসবে, hard-coded sample customer data নয়।

## Customer profile UI and data

- [x] Customer identity-তে actual name, email, phone, avatar/initials ও returning/new status দেখাবে; unavailable field-এ safe empty state দেখাবে।
- [x] Summary-তে order count, lifetime spending, customer-since date ও status থাকবে; Details view-তে account fields এবং order insights actual loaded orders থেকে হিসাব করে দেখাবে।
- [x] Order history-তে matching customer-এর actual order number, date, status, amount, এবং saved product thumbnails/items দেখাবে; কোনো matching order না থাকলে empty state দেখাবে; existing order-open action বজায় থাকবে।
- [x] Notes view-তে customer-এর জন্য category-সহ note যোগ ও দেখা যাবে; Important, Delivery, Payment, Call ও General category থাকবে; notes customer id অনুযায়ী scoped হবে এবং existing admin-only storage policy ব্যবহার করবে।
- [x] Profile page mobile ও desktop-এ readable/responsive হবে এবং user-provided three mockups-এর hierarchy/visual direction অনুসরণ করবে।
- [x] Admin-only data boundary অক্ষুণ্ণ থাকবে; customer profile email/name/phone update permission বা migration যোগ করা হবে না।

## Verification

- [x] Customer profile/component route tests, type/lint checks, relevant test suite, production build pass করবে.
- [x] Running preview route HTTP response-এ সাড়া দেবে এবং route manifest customer route-টি অন্তর্ভুক্ত রাখবে.

> Current preview: Supabase Auth health HTTP 200; `/admin` এখন admin sign-in screen দেখায়। এই browser session-এ কোনো account credentials submit করা হয়নি। Valid login-এর পরে account-এ admin role থাকাও জরুরি। Supabase secret key local file বা app bundle-এ রাখা হয়নি.
