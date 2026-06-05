import { GalleryAdBanner as GalleryAdBannerData } from '@/src/lib/gallery/loadGalleryAdBanner'

type GalleryAdBannerProps = {
  banner: GalleryAdBannerData
}

/** Gallery Epic 风格：主内容区底部居中挂件横幅 */
export function GalleryAdBanner({ banner }: GalleryAdBannerProps) {
  const { url, imageSrc, promoText } = banner

  return (
    <aside className="shrink-0 bg-white px-6 py-3 lg:px-10">
      <div className="mx-auto w-full max-w-[min(520px,72%)]">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group relative flex h-8 w-full items-center overflow-hidden rounded-md shadow-[0_1px_4px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition-shadow duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.16)] sm:h-9"
        >
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
          {promoText ? (
            <div className="relative z-10 flex h-full w-full items-center bg-black/45 px-3 transition-colors group-hover:bg-black/55 sm:px-4">
              <p className="w-full truncate text-center font-gallery text-[10px] font-medium tracking-wide text-white sm:text-[11px]">
                {promoText}
              </p>
            </div>
          ) : (
            <span className="sr-only">广告</span>
          )}
        </a>
      </div>
    </aside>
  )
}
