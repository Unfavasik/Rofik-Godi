import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'node:url';
import {defineConfig, loadEnv, type Plugin} from 'vite';

const omitOversizedOnnxWasm: Plugin = {
  name: 'omit-oversized-onnx-wasm',
  apply: 'build',
  generateBundle(_options, bundle) {
    // Transformers.js loads the ONNX runtime WASM from its configured CDN; this bundled fallback exceeds
    // Cloudflare Pages' per-file limit and is not needed in the published site.
    for (const [fileName, output] of Object.entries(bundle)) {
      if (
        output.type === 'asset' &&
        fileName.startsWith('assets/ort-wasm-') &&
        fileName.endsWith('.wasm')
      ) {
        delete bundle[fileName];
      }
    }
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1,.manus.computer')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.SUPABASE_URL || ''),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || ''),
      'import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL': JSON.stringify(env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || ''),
    },
    plugins: [react(), tailwindcss(), omitOversizedOnnxWasm],
    resolve: {
      alias: {
          '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.'),
      },
      // Keep every component on the same React dispatcher instance.
      dedupe: ['react', 'react-dom'],
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react-vendor', test: /node_modules\/(?:react|react-dom|scheduler)\// },
              { name: 'supabase-vendor', test: /node_modules\/@supabase\// },
              { name: 'motion-vendor', test: /node_modules\/(?:motion|framer-motion|@motion)\// },
              { name: 'icons-vendor', test: /node_modules\/lucide-react\// },
              {
                name: 'transformers-vendor',
                test: /node_modules\/(?:@huggingface\/transformers|onnxruntime-web)\//,
              },
              { name: 'vendor', test: /node_modules/ },
            ],
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
