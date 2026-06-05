'use client'

import { useState } from 'react'

type GalleryGridImageProps = {
  src: string
  index: number
  appendFrom: number
  onOpen: () => void
}

export function GalleryGridImage({
  src,
  index,
  appendFrom,
  onOpen,
}: GalleryGridImageProps) {
  const [loaded, setLoaded] = useState(false)
  const isLoadMoreItem = index >= appendFrom && appendFrom > 0
  const staggerIndex = isLoadMoreItem ? index - appendFrom : index
  const delay = Math.min(staggerIndex, 11) * (isLoadMoreItem ? 60 : 45)

  return (
    <button
      type="button"
      data-gallery-index={index}
      onClick={onOpen}
      className={`gallery-grid-cell group relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-100 text-left ring-0 transition-all hover:ring-2 hover:ring-neutral-900/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
        isLoadMoreItem ? 'gallery-grid-load-more-item' : 'gallery-grid-enter-item'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`gallery-grid-image-shimmer absolute inset-0 transition-opacity duration-500 ease-out ${
          loaded ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        aria-hidden
      />
      <img
        src={src}
        alt=""
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.02] ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
      />
    </button>
  )
}
