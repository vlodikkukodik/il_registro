import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'
import { authGuard } from './guards'
import { setApiRouter } from '@/services/api'
import { i18n } from '@/i18n'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

if (typeof setApiRouter === 'function') {
    setApiRouter(router)
}

router.beforeEach((to, from) => authGuard(to, from))

router.afterEach((to) => {
    const base = 'Registro Elettronico'
    let resolvedTitle = ''

    if (to.meta?.titleKey && typeof i18n?.global?.t === 'function') {
        const translated = i18n.global.t(to.meta.titleKey)
        if (translated && translated !== to.meta.titleKey) {
            resolvedTitle = translated
        }
    }

    if (!resolvedTitle && to.meta?.title) {
        resolvedTitle = to.meta.title
    }

    if (resolvedTitle) {
        document.title = `${resolvedTitle} — ${base}`
        return
    }

    let section = ''
    if (to.path.startsWith('/admin')) {
        section = 'Admin'
    } else if (to.path.startsWith('/teacher')) {
        section = 'Docente'
    } else if (to.path.startsWith('/student')) {
        section = 'Studente'
    } else if (to.path.startsWith('/parent')) {
        section = 'Famiglie'
    } else if (to.path.startsWith('/secretary')) {
        section = 'Segreteria'
    }
    
    document.title = section ? `${section} — ${base}` : base
})

router.onError((error, to) => {
    if (error.message && /loading chunk|failed to fetch dynamically imported module/i.test(error.message)) {
        console.error('Lazy-load chunk failure detected:', error)
        const retryKey = `chunk_retry_${to?.fullPath || 'unknown'}`
        if (!sessionStorage.getItem(retryKey)) {
            // First attempt: mark the retry and reload once
            sessionStorage.setItem(retryKey, '1')
            if (to?.fullPath) {
                const base = import.meta.env.BASE_URL.replace(/\/$/, '')
                window.location.assign(base + to.fullPath)
            } else {
                window.location.reload()
            }
        } else {
            // Already retried: clear the flag and do not loop
            sessionStorage.removeItem(retryKey)
            console.error('Chunk load definitively failed after retry. The user may need to clear cache.', error)
        }
        return
    }

    // Any other navigation error (e.g. a rejected async guard) would
    // otherwise leave the page silently blank with no visible signal.
    console.error('Router navigation error:', error)
    if (typeof window !== 'undefined' && typeof window.__showBlankPageError === 'function') {
        window.__showBlankPageError('Errore di navigazione:', (error && (error.stack || error.message)) || String(error))
    }
})

export default router
