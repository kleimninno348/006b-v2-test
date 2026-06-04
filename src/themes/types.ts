import { Page, Post, Title } from '@/src/types/blog'

export type ThemeId = 'anzifan' | 'touchgal' | 'gallery'

/**
 * 各主题首页组件共用 props。
 * posts 已在 index SSG 中限制为最多 BLOG_HOME_POSTS_MAX（默认 120）篇，
 * 且已按 Notion「pinned」置顶优先、再按日期降序（sortPostsByPinnedThenDate）。
 */
export type ThemeHomeProps = {
  posts: Post[]
  widgets: { [key: string]: unknown }
  siteTitle?: Title
  navPages?: Page[]
}
