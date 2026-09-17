import quasarLangIt from 'quasar/lang/it'
import { Quasar } from 'quasar'
import { loadLocaleMessages } from '../i18n/loader'

export const SUPPORTED_LOCALES = [
  { label: 'Italiano', value: 'it-IT', code: 'IT', flag: '🇮🇹', icon: 'flag', dir: 'ltr' },
  { label: 'English', value: 'en-US', code: 'EN', flag: '🇬🇧', icon: 'language', dir: 'ltr' },
  { label: 'Deutsch', value: 'de-DE', code: 'DE', flag: '🇩🇪', icon: 'language', dir: 'ltr' },
  { label: 'Français', value: 'fr-FR', code: 'FR', flag: '🇫🇷', icon: 'language', dir: 'ltr' },
  { label: 'Español', value: 'es-ES', code: 'ES', flag: '🇪🇸', icon: 'language', dir: 'ltr' },
  { label: 'Română', value: 'ro-RO', code: 'RO', flag: '🇷🇴', icon: 'language', dir: 'ltr' },
  { label: 'Shqip', value: 'sq-AL', code: 'SQ', flag: '🇦🇱', icon: 'language', dir: 'ltr' },
  { label: 'Русский', value: 'ru-RU', code: 'RU', flag: '🇷🇺', icon: 'language', dir: 'ltr' },
  { label: 'Українська', value: 'uk-UA', code: 'UK', flag: '🇺🇦', icon: 'language', dir: 'ltr' },
  { label: 'العربية', value: 'ar-SA', code: 'AR', flag: '🇸🇦', icon: 'language', dir: 'rtl' },
  { label: '中文 (简体)', value: 'zh-CN', code: 'ZH', flag: '🇨🇳', icon: 'language', dir: 'ltr' }
]

// Loaded lazily (not bundled eagerly): each of these packs is only needed
// when a user actually switches to that language, and eagerly importing all
// eleven bloated the initial bundle with every script (Arabic, Chinese,
// Cyrillic, ...) merged into it — which triggered a WebKit/Safari parsing
// failure on iOS for pages loading that chunk.
const QUASAR_LANG_LOADERS = {
  'it-IT': () => Promise.resolve(quasarLangIt),
  'it': () => Promise.resolve(quasarLangIt),
  'en-US': () => import('quasar/lang/en-US').then(m => m.default),
  'en': () => import('quasar/lang/en-US').then(m => m.default),
  'de-DE': () => import('quasar/lang/de').then(m => m.default),
  'de': () => import('quasar/lang/de').then(m => m.default),
  'fr-FR': () => import('quasar/lang/fr').then(m => m.default),
  'fr': () => import('quasar/lang/fr').then(m => m.default),
  'es-ES': () => import('quasar/lang/es').then(m => m.default),
  'es': () => import('quasar/lang/es').then(m => m.default),
  'ro-RO': () => import('quasar/lang/ro').then(m => m.default),
  'ro': () => import('quasar/lang/ro').then(m => m.default),
  'sq-AL': () => import('quasar/lang/sq').then(m => m.default),
  'sq': () => import('quasar/lang/sq').then(m => m.default),
  'al': () => import('quasar/lang/sq').then(m => m.default),
  'ru-RU': () => import('quasar/lang/ru').then(m => m.default),
  'ru': () => import('quasar/lang/ru').then(m => m.default),
  'uk-UA': () => import('quasar/lang/uk').then(m => m.default),
  'uk': () => import('quasar/lang/uk').then(m => m.default),
  'ua': () => import('quasar/lang/uk').then(m => m.default),
  'ar-SA': () => import('quasar/lang/ar').then(m => m.default),
  'ar': () => import('quasar/lang/ar').then(m => m.default),
  'zh-CN': () => import('quasar/lang/zh-CN').then(m => m.default),
  'zh': () => import('quasar/lang/zh-CN').then(m => m.default),
  'cn': () => import('quasar/lang/zh-CN').then(m => m.default)
}

export function normalizeLocale(lang) {
  if (!lang || typeof lang !== 'string') return 'it-IT'
  const trimmed = lang.trim().toLowerCase()
  if (!trimmed) return 'it-IT'

  const exact = SUPPORTED_LOCALES.find(
    l => l.value.toLowerCase() === trimmed || l.code.toLowerCase() === trimmed
  )
  if (exact) return exact.value

  const byPrefix = SUPPORTED_LOCALES.find(
    l => l.value.toLowerCase().startsWith(trimmed) || trimmed.startsWith(l.value.toLowerCase().slice(0, 2))
  )
  return byPrefix ? byPrefix.value : 'it-IT'
}

export function getBrowserLocale() {
  try {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return normalizeLocale(navigator.language)
    }
  } catch (e) {
    console.warn('Could not detect browser locale:', e)
  }
  return 'it-IT'
}

export function getSavedLocale(fallbackToBrowser = false) {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('app_language') || localStorage.getItem('user_locale')
      if (saved) return normalizeLocale(saved)
    }
  } catch (e) {
    console.warn('Could not read saved locale from localStorage:', e)
  }

  if (fallbackToBrowser) {
    return getBrowserLocale()
  }

  return 'it-IT'
}

// Synchronous fallback for contexts that need a pack immediately (app boot):
// always Italian, since that's the only one guaranteed already in memory.
// Callers wanting the real pack for a saved non-Italian preference should
// use getQuasarLangAsync and apply it once resolved (see applyLocale).
export function getQuasarLang() {
  return quasarLangIt
}

export function getQuasarLangAsync(langCode) {
  const normalized = normalizeLocale(langCode)
  const loader = QUASAR_LANG_LOADERS[normalized]
  return loader ? loader().catch(() => quasarLangIt) : Promise.resolve(quasarLangIt)
}

export function applyLocale(langCode, i18nInstance = null, $q = null) {
  const normalized = normalizeLocale(langCode)
  const isRTL = normalized === 'ar-SA' || normalized === 'ar'

  // 1. Update i18n
  if (i18nInstance) {
    try {
      if (normalized !== 'it-IT' && normalized !== 'it') {
        loadLocaleMessages(normalized, i18nInstance).catch(() => {})
      }

      if (i18nInstance.global && i18nInstance.global.locale) {
        if (typeof i18nInstance.global.locale === 'object' && 'value' in i18nInstance.global.locale) {
          i18nInstance.global.locale.value = normalized
        } else {
          i18nInstance.global.locale = normalized
        }
      } else if (i18nInstance.locale) {
        if (typeof i18nInstance.locale === 'object' && 'value' in i18nInstance.locale) {
          i18nInstance.locale.value = normalized
        } else {
          i18nInstance.locale = normalized
        }
      }
    } catch (err) {
      console.warn('Failed to set i18n locale:', err)
    }
  }

  // 2. Update Quasar Language Pack (lazy-loaded, see QUASAR_LANG_LOADERS)
  getQuasarLangAsync(normalized).then((quasarPack) => {
    try {
      if ($q && $q.lang && typeof $q.lang.set === 'function') {
        $q.lang.set(quasarPack)
      } else if (typeof Quasar !== 'undefined' && Quasar?.lang && typeof Quasar.lang.set === 'function') {
        Quasar.lang.set(quasarPack)
      }
    } catch (err) {
      console.warn('Failed to set Quasar language pack:', err)
    }
  })

  // 3. Update DOM direction and lang
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.setAttribute('lang', normalized)
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
  }

  // 4. Persist in localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('app_language', normalized)
      localStorage.setItem('user_locale', normalized)
    }
  } catch (err) {
    console.warn('Failed to persist locale in localStorage:', err)
  }

  return normalized
}
