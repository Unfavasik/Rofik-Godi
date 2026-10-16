# Customer Profile UI Plan

## উদ্দেশ্য

`/admin/customers/:customerId` route-টি অক্ষুণ্ণ রেখে Customers তালিকার eye action থেকে একটি পূর্ণ, responsive Customer Profile খোলা ও ব্যবহারযোগ্য করা। UI-টি ব্যবহারকারীর দেওয়া তিনটি mockup-এর layout ও visual hierarchy অনুসরণ করবে এবং demo data নয়, বিদ্যমান customer, order ও product data ব্যবহার করবে।

## বাস্তবায়ন ও data flow

- `src/lib/appRoutes.ts`-এর customer route এবং `src/components/AdminPanel.tsx`-এর eye-navigation বজায় থাকবে; customer detail page `AdminCustomerProfile` component-এ থাকবে।
- Customer summary, avatar, recent orders ও product images বিদ্যমান Supabase loaders/state থেকে আসবে। History-তে বর্তমানে লোড হওয়া matching orders দেখানো হবে।
- Profile-এ summary cards, Order history / Details / Notes tabs থাকবে। Details actual profile ও order figures থেকে হিসাব হবে।
- Customer-specific admin notes `app_settings`-এর existing admin-only RLS row-তে keyed JSON হিসেবে load/save হবে; নতুন permission বা customer account write path যোগ হবে না। Note category, message, timestamp, author label এবং remove action থাকবে।
- Account identity field read-only থাকবে; existing policies admin-কে customer profile update দেয় না। Edit affordance থাকলে সেটি existing read-only limitation স্পষ্ট করবে, কোনো hidden write করবে না।
- `public/manus-routes.json`-এ বিদ্যমান route registry বজায় থাকবে; নতুন route লাগবে না।

## Project structure

- `src/components/AdminPanel.tsx`: admin shell, customer route state ও profile props.
- `src/components/AdminCustomerProfile.tsx`: profile header, KPI cards, tabs, order list, details, notes composition.
- `src/lib/supabaseAdmin.ts`: existing customer/admin settings API; প্রয়োজনে customer-note persistence helper এখানে বা dedicated adjacent helper-এ.
- `tests/adminCustomerProfile.test.tsx` এবং `tests/adminPanel.test.tsx`: profile fields/tabs/notes ও route-backed behavior.
- `public/manus-routes.json`: route declaration; existing customer-profile pattern ইতিমধ্যে আছে.

## Design

- **Design Movement:** আধুনিক commerce-dashboard interface, clean mobile-first customer CRM.
- **Core Principles:** দ্রুত scan করা যায়; customer-এর পরিচয় ও lifetime value স্পষ্ট; order activity-তে product imagery; notes এক নজরে শ্রেণিবদ্ধ ও সহজে যোগ করা যায়।
- **Color Philosophy:** Rofik Godi-এর লাল brand accent; নীলের হালকা tint profile/identity-তে; সবুজ/বেগুনি/কমলা KPI ও category-তে আলাদা semantic signal।
- **Layout Paradigm:** উপরে prominent profile hero, তার নিচে চারটি compact metric tile, তারপর pill-style tab rail এবং content section; desktop-এ প্রশস্ত workspace, mobile-এ stacked/scroll-safe layout।
- **Signature Elements:** initials/avatar-সহ profile hero; চার রঙের summary tiles; rounded segmented tabs এবং category-colored note chips.
- **Interaction Philosophy:** eye action route-backed; tabs keyboard-operable; order row opens existing order details; note entry category-selectable; destructive note removal stays explicit and scoped.
- **Animation:** subtle hover/focus transitions; reduced-motion preference respect; decorative animation নেই।
- **Typography System:** existing Tailwind sans stack; bold compact headings, readable body labels, tabular-feeling numeric hierarchy.
- **Brand Essence:** Rofik Godi admin-দের customer history দ্রুত বুঝতে সাহায্য করা, without hiding source data; practical, clear, trustworthy.
- **Brand Voice:** short English UI copy matching the application; e.g. “Customer profile” and “Add a note for your team.”
- **Wordmark & Logo:** existing ROFIK GODI admin identity unchanged.
- **Signature Brand Color:** existing `#D9232D`.

## Scope / constraints

No publishing, credential changes, schema migration, database permission changes, or customer account mutations. If Supabase is not configured in the current preview, live account/order data and saved notes cannot be demonstrated there; production loaders remain the source of truth.
