import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Quasar, Notify, Dialog, Loading } from 'quasar'
import router from './router'
import App from './App.vue'
import { i18n } from './i18n'
import { setApiI18n, setApiRouter } from './services/api'
import { getSavedLocale, getQuasarLang, applyLocale } from './utils/locale'

// Import Quasar css
import '@quasar/extras/material-icons/material-icons.css'
import 'quasar/src/css/index.sass'

// Global styles
import './assets/styles/globals.css'

import { useErrorStore } from './stores/error'
import { useOutboxStore } from './stores/outbox'

const savedLang = getSavedLocale(true)

if (typeof setApiI18n === 'function') {
  setApiI18n(i18n)
}

if (typeof setApiRouter === 'function') {
  setApiRouter(router)
}

// Apply initial DOM attributes (lang, dir)
applyLocale(savedLang, i18n)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)

app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Global Error Handler]:', err, info)
  if (typeof window !== 'undefined' && typeof window.__showBlankPageError === 'function') {
    window.__showBlankPageError('Errore Vue (' + info + '):', (err && (err.stack || err.message)) || String(err))
  }
  try {
    const errorStore = useErrorStore()
    errorStore.reportError(err)
  } catch (storeErr) {
    console.error('Error reporting to errorStore:', storeErr)
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled Promise Rejection]:', event.reason)
    try {
      const errorStore = useErrorStore()
      if (event.reason) {
        errorStore.reportError(event.reason)
      }
    } catch {
      // Store reporting guard
    }
  })
}
app.use(Quasar, {
    plugins: {
        Notify,
        Dialog,
        Loading
    },
    lang: getQuasarLang(savedLang),
    config: {
        brand: {
            primary: '#4F46E5',  // Indigo 600
            secondary: '#06B6D4', // Cyan 500
            accent: '#F59E0B',   // Amber 500

            dark: '#1E293B',     // Slate 900
            'dark-page': '#0F172A', // Slate 950

            positive: '#10B981', // Emerald 500
            negative: '#EF4444', // Red 500
            info: '#3B82F6',     // Blue 500
            warning: '#F59E0B'   // Amber 500
        }
    }
})

try {
  app.mount('#app')
} catch (err) {
  console.error('[app.mount failed]:', err)
  if (typeof window !== 'undefined' && typeof window.__showBlankPageError === 'function') {
    window.__showBlankPageError('Errore al montaggio dell\'app:', (err && (err.stack || err.message)) || String(err))
  }
}

// Initialize the offline outbox: loads pending operations from IndexedDB.
// Done after mount so Pinia is fully available.
useOutboxStore().init().catch(e => console.warn('[outbox] init failed:', e))

// PWA update handling: registerType 'autoUpdate' only swaps in a new service
// worker on navigation/reload by default, so a tab left open never notices a
// new deploy. Poll for updates while the tab is open and reload as soon as a
// new version takes control, so stale cached builds don't linger silently.
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return
        setInterval(() => {
          registration.update().catch(() => {})
        }, 60 * 1000)
      },
      onNeedRefresh() {
        updateSW(true)
      }
    })
  }).catch((e) => console.warn('[pwa] service worker registration failed:', e))
}
