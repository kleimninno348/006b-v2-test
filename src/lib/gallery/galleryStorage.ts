import {
  formatGalleryStorageBytes,
  getBlogSiteId,
  getGalleryQuotaBytes,
} from '@/src/lib/gallery/blogSite'
import { getSupabaseAdmin } from '@/src/lib/supabase/admin'

export { formatGalleryStorageBytes, getGalleryQuotaBytes }

export type GalleryStorageStats = {
  usedBytes: number
  quotaBytes: number
  usedPercent: number
  imageCount: number
  remainingBytes: number
}

export async function getTotalGalleryStorageBytes(): Promise<number> {
  const sb = getSupabaseAdmin()
  if (!sb) return 0

  const siteId = getBlogSiteId()
  const { data, error } = await sb
    .from('gallery_images')
    .select('file_size')
    .eq('site_id', siteId)
  if (error) throw error

  return (data || []).reduce(
    (sum, row) => sum + (Number(row.file_size) > 0 ? Number(row.file_size) : 0),
    0
  )
}

export async function getGalleryStorageBytesBySlug(
  postSlug: string
): Promise<number> {
  const sb = getSupabaseAdmin()
  if (!sb) return 0
  const slug = postSlug.trim()
  if (!slug) return 0

  const siteId = getBlogSiteId()
  const { data: gallery, error: gErr } = await sb
    .from('galleries')
    .select('id')
    .eq('site_id', siteId)
    .eq('post_slug', slug)
    .maybeSingle()
  if (gErr) throw gErr
  if (!gallery?.id) return 0

  const { data, error } = await sb
    .from('gallery_images')
    .select('file_size')
    .eq('site_id', siteId)
    .eq('gallery_id', gallery.id)
  if (error) throw error

  return (data || []).reduce(
    (sum, row) => sum + (Number(row.file_size) > 0 ? Number(row.file_size) : 0),
    0
  )
}

export async function countGalleryStorageImages(): Promise<number> {
  const sb = getSupabaseAdmin()
  if (!sb) return 0
  const siteId = getBlogSiteId()
  const { count, error } = await sb
    .from('gallery_images')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', siteId)
  if (error) throw error
  return count ?? 0
}

export async function getGalleryStorageStats(): Promise<GalleryStorageStats> {
  const [usedBytes, imageCount] = await Promise.all([
    getTotalGalleryStorageBytes(),
    countGalleryStorageImages(),
  ])
  const quotaBytes = getGalleryQuotaBytes()
  const usedPercent =
    quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0
  return {
    usedBytes,
    quotaBytes,
    usedPercent,
    imageCount,
    remainingBytes: Math.max(0, quotaBytes - usedBytes),
  }
}

export class GalleryStorageQuotaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GalleryStorageQuotaError'
  }
}

export async function assertGalleryStorageQuota(input: {
  postSlug: string
  images: { url: string; file_size?: number | null }[]
}): Promise<void> {
  const slug = input.postSlug.trim()
  const quotaBytes = getGalleryQuotaBytes()
  const siteUsed = await getTotalGalleryStorageBytes()
  const thisGalleryUsed = slug ? await getGalleryStorageBytesBySlug(slug) : 0

  const newGalleryBytes = (input.images || []).reduce(
    (sum, img) =>
      sum + (Number(img.file_size) > 0 ? Number(img.file_size) : 0),
    0
  )

  const projected = siteUsed - thisGalleryUsed + newGalleryBytes
  if (projected > quotaBytes) {
    const over = projected - quotaBytes
    throw new GalleryStorageQuotaError(
      `图库容量已满（本站上限 ${formatGalleryStorageBytes(quotaBytes)}）。` +
        `本次保存将超出 ${formatGalleryStorageBytes(over)}，请删除部分图库图片后重试。`
    )
  }
}

export async function canAddGalleryPendingBytes(
  pendingBytes: number
): Promise<{ ok: boolean; usedBytes: number; quotaBytes: number; message?: string }> {
  const usedBytes = await getTotalGalleryStorageBytes()
  const quotaBytes = getGalleryQuotaBytes()
  const add = Math.max(0, Number(pendingBytes) || 0)
  if (usedBytes + add <= quotaBytes) {
    return { ok: true, usedBytes, quotaBytes }
  }
  return {
    ok: false,
    usedBytes,
    quotaBytes,
    message:
      `图库容量不足（已用 ${formatGalleryStorageBytes(usedBytes)} / ${formatGalleryStorageBytes(quotaBytes)}）。` +
      `请删除部分图库图片或联系管理员扩容。`,
  }
}
