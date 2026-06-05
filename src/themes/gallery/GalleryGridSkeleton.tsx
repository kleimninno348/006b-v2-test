import { GALLERY_POST_PAGE_SIZE } from './galleryConstants'

const PLACEHOLDER_COUNT = GALLERY_POST_PAGE_SIZE

type GalleryGridSkeletonProps = {
  showCaption?: boolean
}

/** 图库首屏骨架：与真实 4 列网格同布局，加载完成时无跳动 */
export function GalleryGridSkeleton({ showCaption = true }: GalleryGridSkeletonProps) {
  return (
    <div
      className="gallery-grid-skeleton mb-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="图库加载中"
    >
      <div className="mb-5 flex items-center gap-3">
        <div className="gallery-skeleton-shimmer h-4 w-16 rounded-md" />
        <div className="gallery-skeleton-shimmer h-4 w-10 rounded-md opacity-60" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
        {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
          <div
            key={i}
            className="gallery-skeleton-shimmer aspect-[3/4] w-full rounded-lg"
            style={{ animationDelay: `${i * 70}ms` }}
          />
        ))}
      </div>

      {showCaption ? (
        <p className="mt-8 text-center font-gallery text-[13px] tracking-wide text-neutral-400">
          <span className="gallery-loading-dots inline-flex items-center">
            正在呈现图库
            <span aria-hidden className="ml-0.5 inline-flex">
              <span className="gallery-loading-dot">.</span>
              <span className="gallery-loading-dot">.</span>
              <span className="gallery-loading-dot">.</span>
            </span>
          </span>
        </p>
      ) : null}
    </div>
  )
}
