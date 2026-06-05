'use client'

import { useCallback, useEffect, useState } from 'react'
import { GALLERY_POST_PAGE_SIZE } from './galleryConstants'
import { GalleryGridSkeleton } from './GalleryGridSkeleton'
import { GalleryLightbox } from './GalleryLightbox'

type GalleryApiImage = {
  id: string
  url: string
  thumb_url: string | null
  sort_order: number
}

type GalleryApiResponse = {
  success: boolean
  configured?: boolean
  total?: number
  images?: GalleryApiImage[]
  hasMore?: boolean
  error?: string
}

type GalleryImageGridProps = {
  postSlug: string
  pageSize?: number
}

export function GalleryImageGrid({
  postSlug,
  pageSize = GALLERY_POST_PAGE_SIZE,
}: GalleryImageGridProps) {
  const [images, setImages] = useState<GalleryApiImage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      const res = await fetch(
        `/api/gallery/${encodeURIComponent(postSlug)}?page=${pageNum}&limit=${pageSize}`
      )
      const data: GalleryApiResponse = await res.json()
      if (!data.success) {
        throw new Error(data.error || '加载图库失败')
      }
      const list = data.images || []
      setTotal(data.total || 0)
      setHasMore(!!data.hasMore)
      setActive(list.length > 0 || (data.total || 0) > 0)
      setImages((prev) => (append ? [...prev, ...list] : list))
    },
    [postSlug, pageSize]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setPage(1)
    setLightboxIndex(null)
    fetchPage(1, false)
      .catch((e) => {
        if (!cancelled) {
          setError(e.message)
          setActive(false)
          setImages([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fetchPage])

  const loadMore = async () => {
    if (!hasMore || loadingMore) return
    const next = page + 1
    setLoadingMore(true)
    try {
      await fetchPage(next, true)
      setPage(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return <GalleryGridSkeleton />
  }

  if (!active) {
    if (error) {
      return (
        <p className="py-10 text-center text-sm text-red-500">{error}</p>
      )
    }
    return null
  }

  return (
    <div className="gallery-grid-enter mb-10">
      <p className="mb-5 font-gallery text-[14px] text-neutral-500">
        共 {total} 张
      </p>
      {error ? (
        <p className="mb-4 text-center text-sm text-red-500">{error}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {images.map((img, index) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="gallery-grid-enter-item group relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-100 text-left ring-0 transition-all hover:ring-2 hover:ring-neutral-900/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            style={{ animationDelay: `${Math.min(index, 7) * 45}ms` }}
          >
            <img
              src={img.thumb_url || img.url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {hasMore ? (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="min-w-[140px] rounded-md bg-neutral-900 px-10 py-3 font-gallery text-[15px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60"
          >
            {loadingMore ? '加载中…' : '加载更多'}
          </button>
        </div>
      ) : null}

      <GalleryLightbox
        open={lightboxIndex !== null}
        images={images}
        index={lightboxIndex ?? 0}
        onClose={() => setLightboxIndex(null)}
        onPrev={() =>
          setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))
        }
        onNext={() =>
          setLightboxIndex((i) =>
            i !== null && i < images.length - 1 ? i + 1 : i
          )
        }
      />
    </div>
  )
}

/** 供父组件判断是否应隐藏 Notion 正文块 */
export function useGalleryHasImages(postSlug: string): {
  ready: boolean
  hasGallery: boolean
} {
  const [ready, setReady] = useState(false)
  const [hasGallery, setHasGallery] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/gallery/${encodeURIComponent(postSlug)}?page=1&limit=1`)
      .then((r) => r.json())
      .then((d: GalleryApiResponse) => {
        if (cancelled) return
        setHasGallery(!!d.success && (d.total || 0) > 0)
      })
      .catch(() => {
        if (!cancelled) setHasGallery(false)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [postSlug])

  return { ready, hasGallery }
}
