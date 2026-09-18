import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// Set VITE_BASE_PATH (and pass the same value to --base) when building for a
// subpath deployment (e.g. majordomo's vladinc.ru/registro/), so the PWA
// manifest's scope/start_url match where the app is actually served instead
// of always pointing "Add to Home Screen" at the site root.
const basePath = process.env.VITE_BASE_PATH || '/'

// https://vitejs.dev/config/
export default defineConfig({
  base: basePath,
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version || '1.0.0-beta'),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0])
  },
  build: {
    // Use esbuild instead of terser to avoid serialize-javascript
    // crypto.randomUUID() error in CI / Node < 20 environments
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('quasar') || id.includes('@quasar')) {
              return 'vendor-quasar'
            }
            if (id.includes('chart.js') || id.includes('vue-chartjs')) {
              return 'vendor-charts'
            }
            if (id.includes('vue-i18n')) {
              return 'vendor-i18n'
            }
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router') || id.includes('axios')) {
              return 'vendor-vue'
            }
          }
          if (id.includes('/src/i18n/it-IT/') || id.includes('\\src\\i18n\\it-IT\\') ||
              id.endsWith('/src/i18n/index.js') || id.endsWith('\\src\\i18n\\index.js')) {
            return 'app-i18n'
          }
        }
      }
    }
  },
  plugins: [
    vue({
      template: {
        transformAssetUrls,
        compilerOptions: {
          hoistStatic: false
        }
      }
    }),

    quasar({
      sassVariables: 'src/assets/styles/variables.scss'
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'src': fileURLToPath(new URL('./src', import.meta.url))
    },
    dedupe: ['vue']
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api'],
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  preview: {
    allowedHosts: ['registro.vladinc.ru']
  }
})
