# Rofik Godi Android Release Guide

## Project identity

- Repository: `https://github.com/Unfavasik/Rofik-Godi`
- Android application ID / package name: `com.rofikgodi.centre`
- Native source: `android/`
- Capacitor configuration: `capacitor.config.ts`
- Current release line: version name `1.1.1`, version code `3` (`android/app/build.gradle`)
- Supabase native OAuth callback: `com.rofikgodi.centre://auth/callback`

## What this app build contains

The Android app packages the website assets locally through Capacitor. It includes persistent catalog and notification caches, silent background refresh, Realtime notification updates, session-gated admin RPC calls, Firebase Cloud Messaging registration, native back navigation, and Google OAuth return-to-app handling.

Google OAuth opens a secure Android browser tab, then returns to the app through the custom callback URI. Before native Google sign-in can complete, add `com.rofikgodi.centre://auth/callback` to Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**. Keep the existing Site URL and Google OAuth provider's authorized Supabase callback unchanged; the working provider callback is `https://cyijfvylyhhusackvcuj.supabase.co/auth/v1/callback`.

## Build commands

Use Node.js, pnpm, JDK 21, and Android SDK. Supply the project's public Supabase URL and publishable key through the build environment; do not put server credentials or Firebase service-account JSON in source control.

```bash
pnpm install --frozen-lockfile
export VITE_SUPABASE_URL="https://cyijfvylyhhusackvcuj.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="<project publishable key>"
pnpm build
pnpm exec cap sync android
cd android
./gradlew assembleDebug
```

The debug APK output is `android/app/build/outputs/apk/debug/app-debug.apk`.

## Updating and signing

For each Android update, increment `versionCode` in `android/app/build.gradle`; also update `versionName` for the human-readable release. Keep the application ID exactly `com.rofikgodi.centre`.

This project's APKs are **debug-signed**, not Play Store/release-signed. The signer certificate SHA-256 fingerprint verified for the current and previous sandbox APK is:

```text
a1fc5257d3adcafa3feae37b0beb91edc8b673adc86b8103518e22f12c13ca20
```

Verify any built APK with:

```bash
apksigner verify --print-certs Rofik-Godi.apk
sha256sum Rofik-Godi.apk
```

The private debug keystore is not in this repository or a public release. A build made in another environment may use a different debug key and Android may reject it as an update. Do not upload or commit any private signing key. For reliable public releases, create a dedicated release keystore, keep it in secure storage/CI secrets, and use the same key for every future version; never replace that key after distributing the APK.

## Installing an update manually

1. Download the APK from the GitHub Release page.
2. On Android, allow the browser or Files app to install unknown apps if prompted.
3. Open the downloaded APK and choose **Update/Install**.
4. If Android reports a signature conflict, stop: the APK was signed with a different key. Do not uninstall first unless app-local data loss is acceptable.

This project does not install updates silently or automatically. Users must download and install a release manually unless a managed distribution/update mechanism is added later.

## Release checklist

1. Confirm TypeScript/lint and web build pass.
2. Increment Android `versionCode` and `versionName`.
3. Run `pnpm exec cap sync android` and build the APK.
4. Verify package name, version, signer fingerprint, APK integrity, and SHA-256 checksum.
5. Attach the APK and a `.sha256` checksum file to a GitHub Release. Include the source commit and clearly label debug-signed builds as test/pre-release builds.
6. Never attach Firebase Admin service-account JSON, private signing keys, passwords, or Supabase service-role secrets.
