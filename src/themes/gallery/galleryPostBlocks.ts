import { BlockEnum } from '@/src/types/blog'
import { BlockResponse } from '@/src/types/notion'

/** Gallery 内页正文：封面已由 Notion cover + 顶栏展示，图库走 Supabase，跳过正文图片块 */
export function filterGalleryBodyBlocks(blocks: BlockResponse[]): BlockResponse[] {
  return blocks.filter((block) => block.type !== BlockEnum.image)
}

export function hasGalleryTextBody(blocks: BlockResponse[]): boolean {
  return filterGalleryBodyBlocks(blocks).length > 0
}
