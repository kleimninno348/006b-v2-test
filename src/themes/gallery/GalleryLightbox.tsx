'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export type GalleryLightboxImage = {
  url: string
  thumb_url?: string | null
}

type GalleryLightboxProps = {
  open: boolean
  images: GalleryLightboxImage[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}

export function GalleryLightbox({
  open,
  images,
  index,
  onClose,
  onPrev,
  onNext,
}: GalleryLightboxProps) {
  const current = images[index]
  const hasPrev = index > 0
  const hasNext = index < images.length - 1

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      if (e.key === 'ArrowRight' && hasNext) onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, onPrev, onNext, hasPrev, hasNext])

  if (!open || !current || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/88 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="查看大图"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition-colors hover:bg-white/20"
        aria-label="关闭"
      >
        ×
      </button>

      {hasPrev ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onPrev()
          }}
          className="absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 px-3 py-6 text-white transition-colors hover:bg-white/20 sm:block"
          aria-label="上一张"
        >
          ‹
        </button>
      ) : null}

      {hasNext ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNext()
          }}
          className="absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-white/10 px-3 py-6 text-white transition-colors hover:bg-white/20 sm:block"
          aria-label="下一张"
        >
          ›
        </button>
      ) : null}

      <div
        className="flex max-h-full max-w-full flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.url}
          alt=""
          className="max-h-[85vh] max-w-[min(92vw,1200px)] select-none object-contain"
          draggable={false}
        />
        <p className="mt-4 font-gallery text-sm text-white/70">
          {index + 1} / {images.length}
        </p>
      </div>
    </div>,
    document.body
  )
}
