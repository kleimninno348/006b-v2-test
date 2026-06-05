'use client'

import { BlockRender } from '@/src/components/blocks/BlockRender'
import { BlockResponse } from '@/src/types/notion'
import { GalleryImageGrid, useGalleryHasImages } from './GalleryImageGrid'
import { galleryProseClass } from './galleryFonts'

type GalleryPostContentProps = {
  postSlug: string
  blocks: BlockResponse[]
}

export function GalleryPostContent({ postSlug, blocks }: GalleryPostContentProps) {
  const { ready, hasGallery } = useGalleryHasImages(postSlug)

  return (
    <>
      <GalleryImageGrid postSlug={postSlug} />

      {ready && !hasGallery ? (
        <div
          className={`${galleryProseClass} rounded-sm border border-neutral-200 bg-white px-6 py-8 md:px-10`}
        >
          <BlockRender blocks={blocks} />
        </div>
      ) : null}

      {ready && hasGallery ? (
        <p className="mt-2 text-center text-[12px] text-neutral-400">
          本篇使用图库模式展示；文字说明见上方摘要。
        </p>
      ) : null}
    </>
  )
}
