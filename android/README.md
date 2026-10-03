# Android launcher icon resources

This directory contains the native Android launcher icon resources for an Android wrapper around the web app.

- `mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml` define proper Android Adaptive Icons.
- The adaptive icon background is `@android:color/transparent`; no white, black, or rounded-square artwork is baked into the icon.
- `drawable-nodpi/ic_launcher_foreground.png` contains only the transparent red 3D box artwork, centered within the adaptive-icon safe zone.
- `mipmap-*/ic_launcher*.png` provide transparent legacy fallbacks for pre-Android 8 devices.
- `src/main/AndroidManifest.xml` wires `android:icon` and `android:roundIcon` to the resources.

The repository is currently a Vite web app and does not include a Gradle wrapper or Android application module. The Android wrapper/build should use this `android/app/src/main` resource tree as its app module resources; its own manifest/activity configuration can merge with the icon declarations here.
