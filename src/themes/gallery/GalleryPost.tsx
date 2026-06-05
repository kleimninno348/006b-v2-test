import { Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import Link from 'next/link'
import CONFIG from '@/blog.config'
import { GalleryAdBanner as GalleryAdBannerData } from '@/src/lib/gallery/loadGalleryAdBanner'
import { GalleryRecommendPost } from '@/src/lib/gallery/galleryRecommendations'
import { GalleryAdBanner } from './GalleryAdBanner'
import { GalleryBreadcrumb } from './GalleryBreadcrumb'
import { GalleryPostDownloadButton } from './GalleryPostDownloadButton'
import { GalleryPostContent } from './GalleryPostContent'
import { GalleryPostRecommendations } from './GalleryPostRecommendations'
import {
  galleryCardTagClass,
  galleryPostTagLinkClass,
  galleryPostTitleClass,
} from './galleryFonts'

type GalleryPostProps = {
  post: Post
  blocks: BlockResponse[]
  recommendations: GalleryRecommendPost[]
  galleryAdBanner?: GalleryAdBannerData | null
}

export const GalleryPost = ({
  post,
  blocks,
  recommendations,
  galleryAdBanner = null,
}: GalleryPostProps) => {
  const downloadValue = post.options?.download?.trim() ?? ''

  return (
    <>
      <GalleryBreadcrumb
        items={[
          { label: '首页', href: '/' },
          {
            label: post.category?.name || '未分类',
            href: `/${CONFIG.DEFAULT_SPECIAL_PAGES.CATEGORY}/${post.category?.id || ''}`,
          },
          { label: post.title },
        ]}
      />
      <main className="flex flex-1 flex-col bg-white px-6 py-6 pb-8 lg:px-10">
        <article className="mx-auto w-full max-w-[1120px]">
          <div className="mb-3 flex items-start justify-between gap-6">
            <h1 className={`min-w-0 flex-1 ${galleryPostTitleClass}`}>
              {post.title}
            </h1>
            <div className="shrink-0 pt-0.5">
              <GalleryPostDownloadButton
                postTitle={post.title}
                downloadContent={downloadValue}
              />
            </div>
          </div>

          {post.tags && post.tags.length > 0 ? (
            <p className={`mb-6 ${galleryCardTagClass}`}>
              {post.tags.map((tag, index) => (
                <span key={tag.id}>
                  {index > 0 ? (
                    <span className="text-neutral-400" aria-hidden>
                      ,{' '}
                    </span>
                  ) : null}
                  <Link
                    href={`/${CONFIG.DEFAULT_SPECIAL_PAGES.TAG}/${tag.id}`}
                    className={galleryPostTagLinkClass}
                  >
                    {tag.name}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}

          {post.excerpt ? (
            <p className="mb-8 font-gallery text-sm font-normal leading-relaxed tracking-wide text-neutral-500">
              {post.excerpt}
            </p>
          ) : (
            <div className="mb-8" />
          )}

          <GalleryPostContent postSlug={post.slug} blocks={blocks} />

          <GalleryPostRecommendations posts={recommendations} />

          {galleryAdBanner ? <GalleryAdBanner banner={galleryAdBanner} /> : null}
        </article>
      </main>
    </>
  )
}
