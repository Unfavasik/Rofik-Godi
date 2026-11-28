# Rofik Godi — Real Pull-to-Refresh Update

এই ডকুমেন্টে in-app pull-to-refresh-এর latest code update, সম্পূর্ণ flow, GitHub links, Cloudflare deployment নির্দেশনা এবং validation result একসাথে দেওয়া হলো।

## 1. কী update করা হয়েছে

আগে pull-to-refresh করলে শুধু Supabase/API data refetch হতো। এখন refresh flow-এর data/session/cache কাজ শেষ হওয়ার পরে পুরো browser page বা Android WebView document reload হয়।

নতুন flow:

```text
Pull down
  ↓
Existing catalog/session/cache/user data refresh
  ↓
Mounted views-এর refresh event dispatch
  ↓
সর্বোচ্চ ৪.৫ সেকেন্ড অপেক্ষা
  ↓
window.location.reload()
  ↓
React app, JavaScript bundle এবং in-memory state নতুন করে initialize
```

এটি infinite reload loop তৈরি করবে না, কারণ `window.location.reload()` শুধু user-এর pull gesture থেকে চালু হয়। App load হওয়ার সময় নিজে থেকে pull-refresh handler call হয় না।

## 2. GitHub links

- Repository: [Unfavasik/Rofik-Godi](https://github.com/Unfavasik/Rofik-Godi)
- Main branch: [github.com/Unfavasik/Rofik-Godi/tree/main](https://github.com/Unfavasik/Rofik-Godi/tree/main)
- Latest hard-refresh commit: [0faa405](https://github.com/Unfavasik/Rofik-Godi/commit/0faa405)
- Latest commit-এর পরিবর্তন: [App.tsx diff](https://github.com/Unfavasik/Rofik-Godi/commit/0faa405.patch)

## 3. Actual code change

পরিবর্তনটি `src/App.tsx`-এর `handleGlobalPullRefresh` function-এর শেষে করা হয়েছে। Existing refresh logic অপরিবর্তিত রাখা হয়েছে।

```tsx
const handleGlobalPullRefresh = useCallback(async () => {
  invalidateSwrCache('public:customer-coupons');
  invalidateSwrCachePrefix('public:product-reviews:');
  if (isAdminPath(location.pathname)) {
    invalidateSwrCachePrefix('admin:');
  }

  const tasks: Array<Promise<unknown>> = [
    retryCatalog(),
    loadCustomerCouponOffers()
      .then(({ data, error }) => {
        if (!error) writeSwrCache('public:customer-coupons', data);
      })
      .catch(() => {}),
  ];

  if (supabase) {
    tasks.push(supabase.auth.getSession().catch(() => undefined));
  }

  if (!currentUser.isGuest && currentUser.id) {
    const targetUserId = currentUser.id;
    invalidateSwrCachePrefix(`user:${targetUserId}:`);
    invalidateSwrCachePrefix('user:order-history:');
    notifyCustomerOrdersUpdated(targetUserId);
    tasks.push(
      refreshNotificationCount(true),
      listMyWishlist()
        .then((rows) => {
          const ids = new Set(rows.map((row) => row.product_id));
          setWishlist(catalogProducts.filter((product) => ids.has(product.id)));
        })
        .catch(() => {}),
      getMyProfile(targetUserId)
        .then((profile) => {
          if (!profile) return;
          setCurrentUser((current) =>
            current.id === targetUserId
              ? {
                  ...current,
                  name: profile.full_name?.trim() || current.name,
                  phone: profile.phone || current.phone,
                  avatar: profile.avatar_url || undefined,
                  vehicle: profile.vehicle_model || current.vehicle,
                }
              : current,
          );
        })
        .catch(() => {}),
    );
  }

  tasks.push(dispatchPullToRefresh(4500));

  await Promise.race([
    Promise.allSettled(tasks),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, 4500);
    }),
  ]);

  // Pull-to-refresh is intentionally a hard refresh: after the latest data/session
  // work settles, restart the document so the app bundle and all in-memory state
  // are loaded from a clean WebView/browser context.
  window.location.reload();
}, [
  catalogProducts,
  currentUser.id,
  currentUser.isGuest,
  location.pathname,
  refreshNotificationCount,
  retryCatalog,
  setCurrentUser,
  setWishlist,
]);
```

## 4. Related source files

### 4.1 Pull gesture component

`PullToRefresh.tsx` touch gesture detect করে, threshold পার হলে `onRefresh()` call করে এবং loading animation দেখায়। এটি নিজে `window.location.reload()` call করে না; hard reload-এর দায়িত্ব global refresh handler-এর কাছে থাকে।

- [src/components/PullToRefresh.tsx](https://github.com/Unfavasik/Rofik-Godi/blob/main/src/components/PullToRefresh.tsx)
- [Raw PullToRefresh.tsx](https://raw.githubusercontent.com/Unfavasik/Rofik-Godi/main/src/components/PullToRefresh.tsx)

Relevant trigger code:

```tsx
if (isPullThresholdMet(finalDistance)) {
  updatePhase('refreshing');
  updatePullDistance(PULL_TRIGGER_THRESHOLD);
  const startedAt = Date.now();

  void Promise.resolve()
    .then(() => onRefreshRef.current())
    .catch(() => {
      // Individual loaders manage their own error states
    })
    .finally(() => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, MIN_REFRESH_SPINNER_MS - elapsed);
      // Existing spinner completion and done-state handling continues here.
    });
}
```

### 4.2 Pull-refresh event utility

`pullToRefresh.ts` mounted views এবং modals-কে refresh event subscribe করার সুযোগ দেয়। Registered promises সর্বোচ্চ ৪.৫ সেকেন্ডের মধ্যে wait করা হয়।

- [src/lib/pullToRefresh.ts](https://github.com/Unfavasik/Rofik-Godi/blob/main/src/lib/pullToRefresh.ts)
- [Raw pullToRefresh.ts](https://raw.githubusercontent.com/Unfavasik/Rofik-Godi/main/src/lib/pullToRefresh.ts)

মূল event code:

```ts
export const PULL_TO_REFRESH_EVENT = 'rofik:pull-to-refresh';

export interface PullRefreshEventDetail {
  waitUntil: (promise: Promise<unknown>) => void;
}

export async function dispatchPullToRefresh(timeoutMs = 4500): Promise<void> {
  if (typeof window === 'undefined') return;

  const pending: Array<Promise<unknown>> = [];
  const detail: PullRefreshEventDetail = {
    waitUntil: (promise) => {
      pending.push(Promise.resolve(promise).catch(() => undefined));
    },
  };

  window.dispatchEvent(
    new CustomEvent<PullRefreshEventDetail>(PULL_TO_REFRESH_EVENT, { detail }),
  );

  if (pending.length === 0) return;

  await Promise.race([
    Promise.allSettled(pending),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}
```

### 4.3 Full App source

- [src/App.tsx](https://github.com/Unfavasik/Rofik-Godi/blob/main/src/App.tsx)
- [Raw App.tsx](https://raw.githubusercontent.com/Unfavasik/Rofik-Godi/main/src/App.tsx)

### 4.4 Error-boundary reload

Error recovery-এর জন্য আলাদা reload behavior আগের মতোই আছে। এটি pull-to-refresh-এর অংশ নয়।

- [src/components/AppErrorBoundary.tsx](https://github.com/Unfavasik/Rofik-Godi/blob/main/src/components/AppErrorBoundary.tsx)

## 5. npm এবং Cloudflare Pages configuration

Deployment-এর জন্য npm standard রাখা হয়েছে। `package-lock.json` canonical lockfile এবং stale `bun.lock` ও `pnpm-lock.yaml` রাখা হয়নি।

### package.json scripts

```json
{
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit && eslint .",
    "test": "vitest run tests",
    "test:watch": "vitest tests",
    "format": "prettier --write ."
  }
}
```

### Cloudflare Pages build settings

```text
Build command: npm ci --ignore-scripts --no-audit --no-fund && npm run build
Output directory: dist
Node version: 20 or newer
Package manager: npm
Lockfile: package-lock.json only
```

Cloudflare-এ Bun বা pnpm frozen-lockfile command ব্যবহার করা যাবে না। `package.json` পরিবর্তন হলে `package-lock.json` অবশ্যই synchronize করতে হবে।

- [package.json](https://github.com/Unfavasik/Rofik-Godi/blob/main/package.json)
- [package-lock.json](https://github.com/Unfavasik/Rofik-Godi/blob/main/package-lock.json)
- [README.md](https://github.com/Unfavasik/Rofik-Godi/blob/main/README.md)

## 6. Validation result

Latest commit push করার আগে নিচের সব validation সফল হয়েছে:

```text
npm run lint  ✅
npm run build ✅
npm test      ✅
git diff --check ✅
```

Test result:

```text
Test Files  65 passed (65)
Tests       466 passed (466)
```

Build result:

```text
✓ 2612 modules transformed.
✓ dist/index.html generated.
✓ built successfully.
```

Build-এর বড় chunk সংক্রান্ত warning আছে, কিন্তু এটি deployment failure নয় এবং build সফল হয়েছে।

## 7. Latest Git commit

```text
Commit: 0faa405
Message: fix(refresh): perform full reload on pull to refresh
Branch: main
Status: pushed successfully
```

Verify locally:

```bash
git clone https://github.com/Unfavasik/Rofik-Godi.git
cd Rofik-Godi
git checkout main
git log -1 --oneline
npm ci --ignore-scripts --no-audit --no-fund
npm run lint
npm run build
npm test
```

## 8. User-visible behavior

এখন user app-এর top-level page-এ থেকে নিচে pull করে release করলে:

1. Refresh indicator দেখাবে।
2. Catalog, session, coupon, notification, wishlist, profile এবং subscribed view refresh হবে।
3. Refresh task ৪.৫ সেকেন্ডের মধ্যে settle করবে বা timeout হবে।
4. Browser/WebView document পুরো reload হবে।
5. App নতুন bundle এবং clean in-memory state দিয়ে পুনরায় চালু হবে।

Modal, input, textarea, slider, canvas এবং nested scrolled container-এর gesture আগের মতো pull-refresh trigger করবে না।
