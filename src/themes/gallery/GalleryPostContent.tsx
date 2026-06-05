'use client'

import { BlockRender } from '@/src/components/blocks/BlockRender'
import { BlockResponse } from '@/src/types/notion'
import { GalleryImageGrid, useGalleryHasImages } from './GalleryImageGrid'
import {
  filterGalleryBodyBlocks,
  hasGalleryTextBody,
} from './galleryPostBlocks'
import { galleryProseClass } from './galleryFonts'

type GalleryPostContentProps = {
  postSlug: string
  blocks: BlockResponse[]
}

const proseWrapClass = `${galleryProseClass} rounded-sm border border-neutral-200 bg-white px-6 py-8 md:px-10`

export function GalleryPostContent({ postSlug, blocks }: GalleryPostContentProps) {
  const { ready, hasGallery } = useGalleryHasImages(postSlug)
  const bodyBlocks = filterGalleryBodyBlocks(blocks)
  const showTextBody = hasGalleryTextBody(blocks)

  return (
    <>
      <GalleryImageGrid postSlug={postSlug} />

      {ready && showTextBody ? (
        <div className={hasGallery ? 'mt-8' : ''}>
          <div className={proseWrapClass}>
            <BlockRender blocks={bodyBlocks} />
          </div>
        </div>
      ) : null}

      {ready && hasGallery ? (
        <p className="mt-4 text-center text-[12px] text-neutral-400">
          本篇使用图库模式展示；封面用于列表卡片，图库请在后台 Step 4 管理。
        </p>
      ) : null}

      {ready && !hasGallery && !showTextBody ? (
        <p className="py-6 text-center text-[13px] text-neutral-400">
          暂无图库数据。请在后台「图库（Gallery · Supabase）」上传并保存；封面图块仅作列表封面，不会在此重复显示。
        </p>
      ) : null}
    </>
  )
}
