import Link from 'next/link'
import { ReactNode } from 'react'
import { galleryInlineLinkClass } from './galleryFonts'

export type BreadcrumbItem = {
  label: string
  href?: string
}

type GalleryBreadcrumbProps = {
  items: BreadcrumbItem[]
  /** 右上角操作区，如文章页「作品下载」 */
  trailing?: ReactNode
}

export const GalleryBreadcrumb = ({ items, trailing }: GalleryBreadcrumbProps) => {
  if (!items.length) return null

  return (
    <div className="font-gallery flex items-center justify-between gap-4 px-6 pt-5 antialiased">
    <nav
      className="flex min-w-0 flex-wrap items-center gap-1.5 text-[15px] leading-none"
      aria-label="面包屑"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
            {index > 0 ? (
              <span className="select-none text-neutral-300" aria-hidden>
                /
              </span>
            ) : null}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className={galleryInlineLinkClass}
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-bold text-neutral-900">{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
    {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  )
}
