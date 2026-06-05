import {
  isSupabaseGalleryConfigured,
} from '@/src/lib/supabase/admin'
import { listGalleryImages } from '@/src/lib/gallery/galleryDb'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ success: false, error: '仅支持 GET' })
  }

  if (!isSupabaseGalleryConfigured()) {
    return res.status(503).json({
      success: false,
      error: '图库服务未配置',
      configured: false,
    })
  }

  const slug = String(req.query.slug || '').trim()
  if (!slug) {
    return res.status(400).json({ success: false, error: '缺少 slug' })
  }

  const page = parseInt(String(req.query.page || '1'), 10)
  const limit = parseInt(String(req.query.limit || '24'), 10)

  try {
    const result = await listGalleryImages(slug, page, limit)
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300'
    )
    return res.status(200).json({
      success: true,
      configured: true,
      slug,
      ...result,
    })
  } catch (e) {
    console.error('GET /api/gallery/[slug]', e)
    return res.status(500).json({
      success: false,
      error: e instanceof Error ? e.message : '读取图库失败',
    })
  }
}
