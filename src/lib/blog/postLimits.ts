import CONFIG from '@/blog.config'
import { Post } from '@/src/types/blog'
import { sortPostsByPinnedThenDate } from './pinnedPosts'

/**
 * 构建期文章数量上限（防 Vercel 部署超时）。
 * 所有主题的首页 posts 均应在 index getStaticProps 中经此限制；
 * 新主题请只消费 props.posts，勿在主题内再次全量拉取 Notion。
 */
export const BLOG_HOME_POSTS_MAX =
  (CONFIG as { HOME_BUILD_POSTS_MAX?: number }).HOME_BUILD_POSTS_MAX ?? 120

/** 预渲染文章路径上限（其余走 fallback: blocking） */
export const BLOG_STATIC_POST_PATHS_MAX =
  (CONFIG as { STATIC_POST_PATHS_MAX?: number }).STATIC_POST_PATHS_MAX ?? 120

export function capHomePosts(posts: Post[]): Post[] {
  const sorted = sortPostsByPinnedThenDate(posts)
  if (sorted.length <= BLOG_HOME_POSTS_MAX) return sorted
  return sorted.slice(0, BLOG_HOME_POSTS_MAX)
}
