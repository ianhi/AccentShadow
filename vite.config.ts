import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  build: {
    target: 'es2020', // Support BigInt literals
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'vue-vendor': ['vue', 'vue-router'],
          'audio-vendor': ['wavesurfer.js', '@ricky0123/vad-web']
        }
      }
    },
    // Optimize for Cloudflare Pages
    sourcemap: false, // Disable sourcemaps in production for smaller builds
    minify: 'terser',
    cssMinify: true,
    reportCompressedSize: false // Speed up build process
  },
  define: {
    global: 'globalThis',
  },
  // Optimize preview for Cloudflare Pages preview
  preview: {
    port: 4173,
    strictPort: true
  }
})
