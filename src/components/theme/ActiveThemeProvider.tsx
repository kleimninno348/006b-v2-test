import { resolveThemeId } from '@/src/themes/registry'
import { ThemeId } from '@/src/themes/types'
import { useRouter } from 'next/router'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const SYNC_PARAM = '_theme_sync'

const ActiveThemeContext = createContext<ThemeId>('anzifan')

export function useActiveTheme(): ThemeId {
  return useContext(ActiveThemeContext)
}

export function ActiveThemeProvider({
  initialTheme,
  isAdminRoute,
  children,
}: {
  initialTheme?: string | null
  isAdminRoute: boolean
  children: ReactNode
}) {
  const router = useRouter()
  const staticTheme = useMemo(
    () => resolveThemeId(initialTheme || 'anzifan'),
    [initialTheme]
  )
  const [liveTheme, setLiveTheme] = useState<ThemeId>(staticTheme)

  useEffect(() => {
    setLiveTheme(staticTheme)
  }, [staticTheme])

  useEffect(() => {
    if (isAdminRoute) return

    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/public/active-theme', { cache: 'no-store' })
        if (!res.ok || cancelled) return
        const data = (await res.json()) as { themeId?: ThemeId }
        if (data.themeId) setLiveTheme(data.themeId)
      } catch (error) {
        console.warn('[ActiveThemeProvider] fetch failed', error)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isAdminRoute, staticTheme, router.asPath])

  useEffect(() => {
    if (isAdminRoute || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.has(SYNC_PARAM)) return
    params.delete(SYNC_PARAM)
    const qs = params.toString()
    const next = qs ? `${router.pathname}?${qs}` : router.pathname
    router.replace(next, undefined, { shallow: true })
  }, [isAdminRoute, liveTheme, router])

  return (
    <ActiveThemeContext.Provider value={liveTheme}>
      {children}
    </ActiveThemeContext.Provider>
  )
}
