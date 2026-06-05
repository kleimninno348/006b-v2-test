import { createClient, SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient | null = null

/** 项目根地址，勿含 /rest/v1（SDK 会自动拼接） */
export function normalizeSupabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null
  let url = raw.trim().replace(/^['"]|['"]$/g, '')
  url = url.replace(/\/+$/, '')
  url = url.replace(/\/rest\/v1$/i, '')
  return url || null
}

/** 仅服务端 API 使用；需配置 SUPABASE_SERVICE_ROLE_KEY */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().replace(/^['"]|['"]$/g, '')
  if (!url || !key) return null
  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return adminClient
}

export function isSupabaseGalleryConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
