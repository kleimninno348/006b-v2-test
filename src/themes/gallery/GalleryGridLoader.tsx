'use client'

import Lottie from 'lottie-react'
import galleryLoaderStars from './gallery-loader-stars.json'

type GalleryGridLoaderProps = {
  /** 显示更多时内联展示，高度更紧凑 */
  compact?: boolean
}

/** 内页图库加载：Lottie 星星动画（静态导入，避免旧转圈闪现） */
export function GalleryGridLoader({ compact = false }: GalleryGridLoaderProps) {
  return (
    <div
      className={
        compact
          ? 'gallery-grid-loader gallery-grid-loader--compact flex items-center justify-center py-10'
          : 'gallery-grid-loader mb-10 flex min-h-[min(40vh,320px)] items-center justify-center py-16'
      }
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="加载中"
    >
      <Lottie
        animationData={galleryLoaderStars}
        loop
        className="gallery-lottie-loader"
        style={{ width: compact ? 56 : 72, height: compact ? 56 : 72 }}
      />
    </div>
  )
}
