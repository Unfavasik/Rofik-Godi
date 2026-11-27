# Security Summary

**Reviewed Files**: 48
**Issues Resolved**: 12

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| PostgREST Filter Injection | `src/lib/supabaseSupport.ts` | 172 | Pagination cursor timestamps and IDs were interpolated directly into `.or(...)` filter strings without syntax validation. | High | Fixed | Added `validatePostgrestCursor` and `isValidSafeId` in `src/lib/security.ts` to validate ISO timestamps and strict alphanumeric/UUID IDs before constructing `.or(...)` filters, plus `isValidSafeId` checks on resource IDs. |
| Missing Distributed Rate Limiting | `supabase/migrations/20261126140000_security_hardening_and_rate_limits.sql` | 5 | Sensitive PostgreSQL RPCs (`validate_coupon`, order creation/cancellation, support tickets, reviews, alerts, account deletion) had no request throttling. | High | Fixed | Added server-only `public.api_rate_limits`, atomic sliding-window helpers (`require_rate_limit` raising `P0429`, `enforce_edge_rate_limit` restricted to `service_role`), hourly `pg_cron` pruning, and rate limits across all public/authenticated RPCs. |
| Notification Column Tampering Under RLS | `supabase/migrations/20261126140000_security_hardening_and_rate_limits.sql` | 140 | Authenticated customers allowed to update `read_at` on `public.notifications` could overwrite other columns (`title`, `body`, `action_url`, `image_url`, `kind`) in the same UPDATE statement. | High | Fixed | Added `BEFORE UPDATE` trigger `notifications_guard_customer_update` verifying `(to_jsonb(new) - 'read_at') IS NOT DISTINCT FROM (to_jsonb(old) - 'read_at')` for non-admin, non-service callers. |
| Unbounded Alerts & Price Integrity Bypass | `supabase/migrations/20261126140000_security_hardening_and_rate_limits.sql` | 160 | Direct inserts/updates to `public.price_drop_alerts` lacked row caps, active-product price checks, and `triggered_at` reset enforcement. | Medium | Fixed | Added `BEFORE INSERT OR UPDATE` trigger `price_drop_alerts_guard_write` enforcing active-product price bounds, resetting `triggered_at` on target updates, and capping alerts at 100 per user. |
| Unsanitized Custom Vehicle URL in Orders | `supabase/migrations/20261126140000_security_hardening_and_rate_limits.sql` | 454 | `create_store_pickup_order_v3` persisted arbitrary `p_vehicle_image_url` strings without validating scheme safety. | Medium | Fixed | Enforced strict single-slash relative path or `https://` scheme validation on `p_vehicle_image_url` inside `create_store_pickup_order_v3`. |
| Wildcard & Fallback CORS Exposure | `supabase/functions/autofill-product-details/index.ts` | 32 | `autofill-product-details` and `push-notification` returned `Access-Control-Allow-Origin: *`, while email functions fell back to allowing arbitrary `Origin` headers when disallowed. | High | Fixed | Removed wildcard `*` CORS from `autofill-product-details`, removed public CORS headers from internal webhook `push-notification`, and restricted CORS across Edge Functions to allowlisted app/Capacitor/localhost origins with `Vary: Origin`. |
| Unbounded Request Bodies & Missing Timeouts | `supabase/functions/create-razorpay-order/index.ts` | 41 | Edge Functions parsed arbitrary-sized request payloads without size caps, external fetches omitted timeouts, and payment/email/autofill/webhook endpoints lacked distributed rate limiting. | High | Fixed | Added `readBoundedJson` / `readBoundedBytes` returning `413 Payload Too Large` on oversized bodies, `enforce_edge_rate_limit` returning `429` + `Retry-After`, `AbortSignal.timeout(15_000)` on outbound fetches, and `redirect: 'error'` on image fetches. |
| Dynamic `innerHTML` Marker Sink | `src/components/StoreLocationView.tsx` | 539 | Custom driver markers injected HTML strings via `iconEl.innerHTML` on location/heading updates. | Medium | Fixed | Rebuilt marker DOM nodes using `document.createElement`, `document.createElementNS`, safe property assignments, and `iconEl.replaceChildren(...)`. |
| Prototype Pollution & Unsafe Cached/Banner URLs | `src/lib/localCache.ts` | 86 | Local cache helpers and `handleBannerClick` parsed JSON directly with `JSON.parse` and accepted unvalidated `action_url`, `image_url`, `avatar_url`, `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`, or `//` URLs. | Medium | Fixed | Added `safeJsonParse` (stripping `__proto__`, `constructor`, `prototype`) and `sanitizeUrl` (blocking `javascript:`, `data:`, credentialed, backslash, and `//` protocol-relative URLs) across cache, preferences, alerts, redirects, and banners. |
| Weak Non-Cryptographic Identifier Generation | `src/components/AdminCustomerProfile.tsx` | 318 | Fallback admin note identifiers used predictable `Math.random()`. | Low | Fixed | Switched fallback ID generation to CSPRNG-backed `generateSecureToken('note')` using `crypto.randomUUID` / `crypto.getRandomValues`. |
| Missing HTTP Security Headers & CSP | `public/_headers` | 1 | Cloudflare Pages headers configured only `Cache-Control` without clickjacking, MIME-sniffing, referrer, or Content Security Policy protections. | Medium | Fixed | Added global `/*` headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS, and strict `Content-Security-Policy` without `'unsafe-inline'` in `script-src`). |
| Vulnerable Transitive `maplibre-gl` Dependency | `package.json` | 58 | Transitive `@navigatr/web > maplibre-gl` resolved to a vulnerable version with DOM XSS advisories. | High | Fixed | Pinned `maplibre-gl` override to `^6.4.1` (resolving `6.19.0`), wired a default-export & worker URL wrapper (`src/lib/maplibreCompat.ts`), and confirmed zero vulnerabilities in `bun audit`. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| UUID & Resource Identifier Validation | `src/lib/supabaseReviews.ts` | Review fetches, creations, updates, and deletions verify UUID format via shared `isValidUuid` and clamp pagination limits (`1..100`). |
| Order Ownership & Status History | `src/lib/supabaseOrders.ts` | Customer order lookups validate slugs (`32`-char hex), verify signed-in session ownership, and validate identifiers before querying status history. |
| Payment Webhook Integrity | `supabase/functions/razorpay-webhook/index.ts` | Enforces bounded `256 KB` payload reads, per-IP rate limiting, and constant-time HMAC-SHA256 verification via `crypto.subtle.verify`. |
| Outbound Payment Gateway Calls | `supabase/functions/verify-razorpay-payment/index.ts` | Uses server-side `RAZORPAY_KEY_SECRET`, bounded JSON parsing (`32 KB`), `15s` request timeouts, and distributed per-user rate limits. |
| Cart & Preference Persistence | `src/hooks/useCart.ts` | Parses local storage state via `safeJsonParse` with payload size bounds and strips prototype-polluting keys before hydrating state. |

---

## PoC Verification

### 1. PostgREST `.or()` Cursor Filter Injection

#### Summary
| Field | Value |
|---|---|
| Issue Type | Query Filter Injection |
| Impact | High |
| Affected File | `src/lib/supabaseSupport.ts:172` |
| Test Scenario | `listMySupportRequests('customer-1', { lastMessageAt: '2026-11-26T10:00:00Z),id.neq.00000000-0000-0000-0000-000000000000', id: 'ticket-1' })` |

#### How It Was Fixed
Added `validatePostgrestCursor` and `isValidSafeId` in `src/lib/security.ts` to enforce strict ISO-8601 timestamp grammar and strict alphanumeric/UUID characters on cursor fields before `.or(...)` interpolation.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Caller invokes `listMySupportRequests` with crafted filter punctuation inside `cursor.lastMessageAt` | Enters pagination block at `src/lib/supabaseSupport.ts:171` |
| 2 | `validatePostgrestCursor(cursor, 'lastMessageAt')` checks `isValidIsoTimestamp` (`src/lib/security.ts:20-35`) | Regex rejects trailing `),id.neq....` punctuation |
| 3 | `src/lib/supabaseSupport.ts:173-175` returns early with error before `query.or(...)` executes | **Handled Safely** |

#### Conclusion
**Fix Verified** - PostgREST filter operators (`),`, `.neq.`, `,`) cannot reach `.or(...)` and never alter query predicates.

---

### 2. Unthrottled Database RPC Abuse

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Rate Limiting |
| Impact | High |
| Affected File | `supabase/migrations/20261126140000_security_hardening_and_rate_limits.sql:75` |
| Test Scenario | Rapid brute-force calls (`>30` calls/min) to `public.validate_coupon('SAVE10', '[]'::jsonb)` or `create_store_pickup_order_v2` |

#### How It Was Fixed
Created server-only sliding-window table `public.api_rate_limits` and `public.require_rate_limit` / `public.enforce_edge_rate_limit`, wired into coupon, order, support, review, alert, pickup-token, and deletion RPCs.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Authenticated caller invokes `public.validate_coupon` for the 31st time within 60s | Enters function at `20261126140000_security_hardening_and_rate_limits.sql:216` |
| 2 | `public.enforce_rate_limit('rpc:validate_coupon', v_user_id::text, 30, 60)` atomically increments `hit_count` (`lines 45-70`) | Returns `allowed = false` with `reset_in_seconds` |
| 3 | `validate_coupon` immediately rejects further attempts (and mutating RPCs raise SQLSTATE `P0429`) without running business logic | **Handled Safely** |

#### Conclusion
**Fix Verified** - Per-user sliding windows stored in a server-only PostgreSQL table enforce hard rate caps even across horizontally scaled workers.

---

### 3. Customer Notification Column Tampering Under RLS

#### Summary
| Field | Value |
|---|---|
| Issue Type | Row-Level Security Column Over-Permission |
| Impact | High |
| Affected File | `supabase/migrations/20261126140000_security_hardening_and_rate_limits.sql:140` |
| Test Scenario | Authenticated customer sends `UPDATE notifications SET title='Urgent Transfer', action_url='https://evil.example', read_at=now() WHERE user_id = auth.uid()` |

#### How It Was Fixed
Attached `BEFORE UPDATE` trigger `notifications_guard_customer_update` on `public.notifications` comparing old and new JSON representations minus `read_at`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Customer passes RLS `USING (auth.uid() = user_id)` when modifying `title` and `action_url` alongside `read_at` | Trigger `notifications_guard_customer_update` fires before row write |
| 2 | `guard_customer_notification_update()` checks `(to_jsonb(new) - 'read_at') IS DISTINCT FROM (to_jsonb(old) - 'read_at')` at line 147 | Evaluates `true` for non-admin, non-service session |
| 3 | Raises exception SQLSTATE `42501` (`Only notification read status may be updated.`) and rolls back the statement | **Handled Safely** |

#### Conclusion
**Fix Verified** - Customers can toggle `read_at` while every content, link, image, and ownership column remains strictly immutable.

---

### 4. Price Drop Alert Bounds & Trigger Reset Bypass

#### Summary
| Field | Value |
|---|---|
| Issue Type | Business Logic & Resource Limit Bypass |
| Impact | Medium |
| Affected File | `supabase/migrations/20261126140000_security_hardening_and_rate_limits.sql:160` |
| Test Scenario | User directly inserts `threshold_price >= product.price` or >100 alert rows via PostgREST |

#### How It Was Fixed
Added `BEFORE INSERT OR UPDATE` trigger `price_drop_alerts_guard_write` checking active catalog pricing, capping alerts per user at 100, and gating `upsert_my_price_drop_alert` with `require_rate_limit`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Direct table write submits `threshold_price = 5000` for an active product priced at `₹899` | Enters `guard_price_drop_alert_write()` at line 160 |
| 2 | Trigger resolves authoritative `products.price` and compares `new.threshold_price >= v_price` | Validation rejects invalid target threshold and enforces row cap |
| 3 | Database aborts the write before committing | **Handled Safely** |

#### Conclusion
**Fix Verified** - Database trigger enforces alert invariants identically whether called through the RPC or directly via PostgREST.

---

### 5. Unsanitized Custom Vehicle Image URL in Pickup Orders

#### Summary
| Field | Value |
|---|---|
| Issue Type | Unsafe Stored URL Injection |
| Impact | Medium |
| Affected File | `supabase/migrations/20261126140000_security_hardening_and_rate_limits.sql:454` |
| Test Scenario | Attacker invokes `create_store_pickup_order_v3` with `p_vehicle_image_url = 'javascript:alert(1)'` |

#### How It Was Fixed
Validated `p_vehicle_image_url` inside `create_store_pickup_order_v3` against `^(/[A-Za-z0-9._~!$&()*+,;=:@%/-]+|https://[^\s<>"'`]+)$` (blocking `//` protocol-relative URLs and unsafe schemes).

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | RPC receives `p_vehicle_image_url = 'javascript:alert(1)'` | Enters `create_store_pickup_order_v3` at line 454 |
| 2 | Pattern check evaluates regex and checks `not like '//%'` after `left(trim(...), 1000)` | Validation check fails immediately |
| 3 | Function raises invalid vehicle image error and aborts order creation | **Handled Safely** |

#### Conclusion
**Fix Verified** - Only vetted `https://` or single-slash relative image paths can be stored on order records.

---

### 6. Edge Function Wildcard & Misconfigured CORS

#### Summary
| Field | Value |
|---|---|
| Issue Type | Cross-Origin Resource Sharing Exposure |
| Impact | High |
| Affected File | `supabase/functions/autofill-product-details/index.ts:32` |
| Test Scenario | Cross-origin browser request from `Origin: https://attacker.example` with authenticated `Authorization` header to `autofill-product-details` or `send-order-confirmation` |

#### How It Was Fixed
Replaced `'Access-Control-Allow-Origin': '*'` and permissive fallback headers across all Edge Functions with exact allowlist matching (`DEFAULT_ALLOWED_ORIGINS` + `ALLOWED_WEB_ORIGINS` + `Vary: Origin`) and removed CORS headers from internal DB webhook `push-notification`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Request with `Origin: https://attacker.example` arrives at Edge Function CORS builder (`autofill-product-details/index.ts:32`) | `allowedOrigins.has(origin)` evaluates to `false` |
| 2 | `Access-Control-Allow-Origin` header is omitted (`...(origin && allowedOrigins.has(origin) ? ... : {})`) | Response carries no wildcard or reflected origin |
| 3 | Browser enforces Same-Origin Policy and blocks JavaScript on `attacker.example` from reading the response | **Handled Safely** |

#### Conclusion
**Fix Verified** - Disallowed origins never receive permissive CORS headers on any Edge Function.

---

### 7. Edge Function Unbounded Body DoS, Missing Rate Limits & Fetch Redirect/Timeout Hardening

#### Summary
| Field | Value |
|---|---|
| Issue Type | Unbounded Request Payload & Missing Outbound Timeouts / Rate Limits |
| Impact | High |
| Affected File | `supabase/functions/create-razorpay-order/index.ts:41` |
| Test Scenario | Request sending a 5 MB JSON body to `create-razorpay-order` or calling `autofill-product-details` with a 302 redirect target (`http://169.254.169.254/...`) |

#### How It Was Fixed
Added streaming byte-bounded JSON/byte readers (`readBoundedJson` / `readBoundedBytes`) returning `413` before JSON parsing, per-subject `enforce_edge_rate_limit` returning `429` + `Retry-After`, `AbortSignal.timeout(15_000)` on outbound calls, and `redirect: 'error'` on image fetching.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Oversized payload arrives at `readBoundedJson(req)` (`create-razorpay-order/index.ts:41`, limit 32 KB) | Rejects on Content-Length or while streaming chunks past `maxBytes` |
| 2 | Handler catches `"Request payload too large."` and returns `HTTP 413` before `JSON.parse` allocates memory | Memory Spike Prevented |
| 3 | In `autofill-product-details/index.ts:271`, `redirect: 'error'` aborts any HTTP 30x redirect away from the validated image origin | **Handled Safely** |

#### Conclusion
**Fix Verified** - Oversized payloads, redirect-based SSRF pivots, hung upstream requests, and unthrottled Edge bursts are blocked at the Edge gateway.

---

### 8. Map Marker `innerHTML` Sink Refactor

#### Summary
| Field | Value |
|---|---|
| Issue Type | Unsafe DOM `innerHTML` Sink |
| Impact | Medium |
| Affected File | `src/components/StoreLocationView.tsx:539` |
| Test Scenario | Navigation driver marker update invokes patched `cachedMap.updateDriverMarker` with heading/mode state |

#### How It Was Fixed
Replaced HTML template string assignment to `iconEl.innerHTML` with explicit `document.createElement`, `document.createElementNS`, typed DOM properties (`img.src`, `img.alt`), and `iconEl.replaceChildren(rotor)`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Location update calls `cachedMap.updateDriverMarker(options)` (`src/components/StoreLocationView.tsx:512`) | Selects walk SVG or car/bike `<img>` branch |
| 2 | DOM nodes are built programmatically without HTML string parsing (`lines 521-551`) | Zero HTML string evaluation |
| 3 | `iconEl.replaceChildren(rotor)` swaps the marker cleanly; verified at runtime on `/store-map` with 0 console errors | **Handled Safely** |

#### Conclusion
**Fix Verified** - No dynamic `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write` sinks remain in `src/`.

---

### 9. Prototype Pollution & Unsafe Client Redirect/Banner URLs

#### Summary
| Field | Value |
|---|---|
| Issue Type | Prototype Pollution & Unsafe Navigation URL |
| Impact | Medium |
| Affected File | `src/lib/localCache.ts:86` |
| Test Scenario | Poisoned JSON `'{"__proto__":{"polluted":true}}'` in storage and banner/notification URL `'javascript:alert(1)'` or `'//evil.example'` |

#### How It Was Fixed
Added `safeJsonParse` (stripping `__proto__`, `constructor`, `prototype`) and `sanitizeUrl` (`src/lib/security.ts:46-124`) across `localCache.ts`, `swrCache.ts`, `customerPreferences.ts`, `priceDropAlerts.ts`, `useCart.ts`, `oauthRedirect.ts`, `supabaseCustomer.ts`, and `App.tsx`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Poisoned notification/alert JSON enters `safeJsonParse` (`src/lib/security.ts:113`) | `stripDangerousObjectKeys` omits `__proto__`, `constructor`, `prototype` |
| 2 | `sanitizeUrl('javascript:alert(1)')` and `sanitizeUrl('//evil.example')` run in `localCache.ts:86-87` and `App.tsx:1662-1667` | Non-HTTPS / `//` / backslash / credentialed URLs return `null` |
| 3 | `( {} ).polluted` remains `undefined` and unsafe URLs never reach browser navigation (`verified in security.test.ts & securityHardening.test.ts`) | **Handled Safely** |

#### Conclusion
**Fix Verified** - Client storage deserialization and URL navigation paths reject prototype-polluting keys and dangerous URL schemes.

---

### 10. Weak Pseudo-Random Token Generation

#### Summary
| Field | Value |
|---|---|
| Issue Type | Predictable Identifier Generation |
| Impact | Low |
| Affected File | `src/components/AdminCustomerProfile.tsx:318` |
| Test Scenario | Saving a local/fallback admin note generates a new ID without relying on `Math.random()` |

#### How It Was Fixed
Added `generateSecureToken` in `src/lib/security.ts:142` backed exclusively by Web Crypto CSPRNG (`crypto.randomUUID()` / `crypto.getRandomValues()`), replacing `Math.random()` in `AdminCustomerProfile.tsx:318`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Note save executes `generateSecureToken('note')` (`src/components/AdminCustomerProfile.tsx:318`) | Enters CSPRNG generator |
| 2 | Invokes `globalThis.crypto.randomUUID()` or `getRandomValues()` (`src/lib/security.ts:148-158`) | Emits unpredictable `note-<uuid>` token |
| 3 | Repository scan confirms zero `Math.random(` calls remain across `src/` | **Handled Safely** |

#### Conclusion
**Fix Verified** - Admin note IDs are generated from cryptographically secure randomness.

---

### 11. HTTP Security Headers & Content-Security-Policy

#### Summary
| Field | Value |
|---|---|
| Issue Type | Missing Security Headers & Clickjacking / XSS Defense-in-Depth |
| Impact | Medium |
| Affected File | `public/_headers:1` |
| Test Scenario | Serving `/index.html` or `/assets/*` via Cloudflare Pages without frame/MIME/CSP restrictions |

#### How It Was Fixed
Configured global `/*` security headers in `public/_headers` including `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin-allow-popups`, HSTS, and strict `Content-Security-Policy` blocking inline script execution (`script-src 'self' https://checkout.razorpay.com`).

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Static hosting serves any route matching `/*` in `public/_headers:1-9` | Attaches full header set while keeping route cache policies intact |
| 2 | Any untrusted `<script>` or external frame attempt violates `script-src`, `object-src 'none'`, and `frame-ancestors 'none'` | Blocked at browser policy boundary |
| 3 | Verified via `tests/securityHardening.test.ts` assertions on `public/_headers` | **Handled Safely** |

#### Conclusion
**Fix Verified** - Deployed static responses enforce frame isolation, MIME integrity, and script origin allowlists.

---

### 12. Vulnerable Transitive `maplibre-gl` Package Upgrade

#### Summary
| Field | Value |
|---|---|
| Issue Type | Known Vulnerable Dependency |
| Impact | High |
| Affected File | `package.json:58` |
| Test Scenario | `bun audit` before remediation reported DOM XSS advisory on transitive `maplibre-gl@4.7.1` |

#### How It Was Fixed
Added `"maplibre-gl": "^6.4.1"` to `overrides` and `pnpm.overrides` in `package.json` (installing `6.19.0`), created `src/lib/maplibreCompat.ts` providing the default export & self-hosted `maplibre-gl-worker.mjs?url` configuration needed by `@navigatr/web`, and excluded `@navigatr/web` and `maplibre-gl` from Vite `optimizeDeps`.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Dependency resolution installs patched `maplibre-gl@6.19.0` across lockfile | `bun audit` checks 383 packages with **0 vulnerabilities** |
| 2 | `vite.config.ts:22` routes `maplibre-gl` imports to `src/lib/maplibreCompat.ts`, registering Vite's local worker URL | Both dev server and `dist/assets/maplibre-gl-worker-*.mjs` load cleanly |
| 3 | Verified production build (`vite build`) and rendered interactive Berhampore map in Playwright (`/store-map`) with 0 console errors | **Handled Safely** |

#### Conclusion
**Fix Verified** - Transitive `maplibre-gl` vulnerability is eliminated while preserving full interactive map functionality.
