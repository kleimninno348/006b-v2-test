import { ReactNode } from 'react'

type GalleryPageLayoutProps = {
  children: ReactNode
}

/** Gallery 页面外层：强制白底铺满视口，避免 dark 主题露出黑条 */
export function GalleryPageLayout({ children }: GalleryPageLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-white text-neutral-900">
      {children}
    </div>
  )
}
