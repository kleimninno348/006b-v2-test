'use client'

import Lottie from 'lottie-react'
import { useEffect, useState } from 'react'

type LottieJson = Record<string, unknown>

/** 内页图库首屏加载：Lottie 星星动画（无文案） */
export function GalleryGridLoader() {
  const [animationData, setAnimationData] = useState<LottieJson | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/themes/gallery/gallery-loader-stars.json')
      .then((r) => r.json())
      .then((data: LottieJson) => {
        if (!cancelled) setAnimationData(data)
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      className="gallery-grid-loader mb-10 flex min-h-[min(40vh,320px)] items-center justify-center py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="加载中"
    >
      {animationData ? (
        <Lottie
          animationData={animationData}
          loop
          className="gallery-lottie-loader"
          style={{ width: 72, height: 72 }}
        />
      ) : (
        <div className="gallery-loader-orbit relative size-12" aria-hidden>
          <span className="gallery-loader-orbit__track absolute inset-0 rounded-full border-2 border-neutral-200" />
          <span className="gallery-loader-orbit__ring absolute inset-0 rounded-full border-2 border-transparent border-t-neutral-900 border-r-neutral-700" />
        </div>
      )}
    </div>
  )
}
