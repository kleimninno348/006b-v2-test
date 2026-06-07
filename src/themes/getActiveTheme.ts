import { getRemoteTheme } from '@/src/lib/notion/getBlogData'
import { resolveThemeId } from '@/src/themes/registry'
import { ThemeId } from '@/src/themes/types'

const DEFAULT_THEME: ThemeId = 'anzifan'

/** 从环境变量解析主题（构建期兜底） */
export function themeFromEnv(): ThemeId | null {
  const env = process.env.NEXT_PUBLIC_THEME?.trim()
  return env ? resolveThemeId(env) : null
}

/**
 * 解析当前应使用的主题。
 * getRemoteTheme 在同一次构建内只请求 Notion 一次（见 getBlogData 缓存）。
 * @param fallback 上游已解析的主题（如 withNavFooter 共享 props），Notion 失败时保留
 */
export async function resolveActiveTheme(
  fallback?: ThemeId | string | null
): Promise<ThemeId> {
  const fallbackId = fallback
    ? resolveThemeId(String(fallback))
    : DEFAULT_THEME

  try {
    const code = await getRemoteTheme()
    if (code) return resolveThemeId(code)
  } catch (e) {
    console.error('resolveActiveTheme: getRemoteTheme failed', e)
  }

  const envTheme = themeFromEnv()
  if (envTheme) {
    return envTheme
  }

  return fallbackId
}
