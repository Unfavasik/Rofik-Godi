import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.rofikgodi.centre',
  appName: 'Rofik Godi Center',
  webDir: 'dist',
  // Keep the native shell connected to the deployed web app so website-only
  // UI, modes and copy updates arrive without rebuilding the APK.
  server: {
    url: 'https://rofik-godi.pages.dev',
    cleartext: false,
  },
};
export default config;
