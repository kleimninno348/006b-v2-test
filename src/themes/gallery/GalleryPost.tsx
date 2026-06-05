import CONFIG from '@/blog.config'
import CommentSection from '@/src/components/section/CommentSection'
import { PartialPost, Post } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'
import Link from 'next/link'
import { GalleryBreadcrumb } from './GalleryBreadcrumb'
import { GalleryPostDownloadButton } from './GalleryPostDownloadButton'
import { GalleryPostContent } from './GalleryPostContent'
import {
  galleryCardTagClass,
  galleryInlineLinkClass,
  galleryPostTagLinkClass,
  galleryPostTitleClass,
} from './galleryFonts'

type GalleryPostProps = {
  post: Post
  blocks: BlockResponse[]
  navigation: { previousPost: PartialPost | null; nextPost: PartialPost | null }
}

export const GalleryPost = ({ post, blocks, navigation }: GalleryPostProps) => {
  const { previousPost, nextPost } = navigation
  const downloadValue = post.options?.download?.trim() ?? ''

  return (
    <>
      <GalleryBreadcrumb
        items={[
          { label: '首页', href: '/' },
          { label: post.title },
        ]}
        trailing={
          <GalleryPostDownloadButton
            postTitle={post.title}
            downloadContent={downloadValue}
          />
        }
      />
      <main className="flex-1 bg-white px-6 py-6 lg:px-10">
      <article className="mx-auto w-full max-w-[1120px]">
        <h1 className={`mb-3 ${galleryPostTitleClass}`}>{post.title}</h1>

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

        {(previousPost || nextPost) && (
          <nav className="mt-10 flex flex-col gap-3 border-t border-neutral-200 pt-8 sm:flex-row sm:justify-between">
            {previousPost ? (
              <Link
                href={`/post/${previousPost.slug}`}
                className={`text-sm ${galleryInlineLinkClass}`}
              >
                ← {previousPost.title}
              </Link>
            ) : (
              <span />
            )}
            {nextPost ? (
              <Link
                href={`/post/${nextPost.slug}`}
                className={`text-right text-sm sm:ml-auto ${galleryInlineLinkClass}`}
              >
                {nextPost.title} →
              </Link>
            ) : null}
          </nav>
        )}

        {CONFIG.ENABLE_COMMENT ? (
          <div className="mt-10">
            <CommentSection />
          </div>
        ) : null}
      </article>
    </main>
    </>
  )
}
