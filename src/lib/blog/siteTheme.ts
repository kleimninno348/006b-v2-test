import { getBlogSiteIdOrNull } from '@/src/lib/gallery/blogSite'
import { getSupabaseAdmin } from '@/src/lib/supabase/admin'

const TABLE = 'blog_site_settings'

/** ISR 优先读 Supabase（写入即时可见）；Notion 数据库 filter 查询有索引延迟 */
export async function getSiteThemeCode(): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!supabase || !siteId) return null

  const { data, error } = await supabase
    .from(TABLE)
    .select('theme_code')
    .eq('site_id', siteId)
    .maybeSingle()

  if (error) {
    console.warn('[getSiteThemeCode]', error.message)
    return null
  }

  const code = data?.theme_code?.trim()
  return code || null
}

export async function getSiteThemeConfigPageId(): Promise<string | null> {
  const supabase = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!supabase || !siteId) return null

  const { data, error } = await supabase
    .from(TABLE)
    .select('theme_config_page_id')
    .eq('site_id', siteId)
    .maybeSingle()

  if (error) {
    console.warn('[getSiteThemeConfigPageId]', error.message)
    return null
  }

  const pageId = data?.theme_config_page_id?.trim()
  return pageId || null
}

/** 后台保存 theme-config 时同步（与 Notion 双写） */
export async function syncSiteThemeFromAdmin(
  themeCode: string,
  notionPageId?: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!supabase || !siteId) return

  const code = (themeCode || '').trim()
  if (!code) return

  const row: {
    site_id: string
    theme_code: string
    updated_at: string
    theme_config_page_id?: string
  } = {
    site_id: siteId,
    theme_code: code,
    updated_at: new Date().toISOString(),
  }

  if (notionPageId?.trim()) {
    row.theme_config_page_id = notionPageId.trim()
  }

  const { error } = await supabase.from(TABLE).upsert(row, { onConflict: 'site_id' })
  if (error) {
    throw new Error(error.message)
  }
}
