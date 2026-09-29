import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// Webview bundle only. The extension host is bundled separately by esbuild.mjs.
// The HTML document is generated at runtime by src/extension/html.ts, which
// expects stable file names: assets/index.js and assets/index.css.
export default defineConfig(({ mode }) => {
  return {
    // relative base + <base href> in the generated HTML makes lazy chunks,
    // fonts and workers resolve inside the webview
    base: './',
    plugins: [tsconfigPaths(), react()],
    resolve: {
      alias: {
        // Also applies to imports from dependencies, which tsconfig paths may not rewrite.
        // The real polyfill throws before React mounts in a VS Code webview.
        'webextension-polyfill': fileURLToPath(new URL('./src/webview/platform/browser-shim.ts', import.meta.url)),
      },
    },
    build: {
      outDir: 'dist/webview',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: 'src/webview/main.tsx',
        },
        output: {
          entryFileNames: 'assets/index.js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
          manualChunks: {
            vendor: ['react', 'react-dom'],
            icons: ['react-icons'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
  }
})
