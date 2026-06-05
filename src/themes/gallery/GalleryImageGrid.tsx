'use client'

import { useCallback, useEffect, useState } from 'react'

const DEFAULT_PAGE_SIZE = 24

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
  pageSize = DEFAULT_PAGE_SIZE,
}: GalleryImageGridProps) {
  const [images, setImages] = useState<GalleryApiImage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')

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
    return (
      <p className="py-8 text-center text-sm text-neutral-400">图库加载中…</p>
    )
  }

  if (!active) return null

  return (
    <div className="mb-8">
      <p className="mb-4 text-[13px] text-neutral-500">
        共 {total} 张
      </p>
      {error ? (
        <p className="mb-4 text-center text-sm text-red-500">{error}</p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {images.map((img) => (
          <a
            key={img.id}
            href={img.url}
            target="_blank"
            rel="noreferrer"
            className="group relative aspect-[3/4] overflow-hidden rounded-md bg-neutral-100"
          >
            <img
              src={img.thumb_url || img.url}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          </a>
        ))}
      </div>
      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-md bg-neutral-900 px-8 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-neutral-800 disabled:opacity-60"
          >
            {loadingMore ? '加载中…' : '加载更多'}
          </button>
        </div>
      ) : null}
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
