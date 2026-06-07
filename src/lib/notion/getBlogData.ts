import { ApiScope } from '@/src/types/notion'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import {
  combineScopeWithFilter,
  slugEqualsFilter,
} from './filter'
import { getAll, queryDatabasePages } from './getDatabase'
import { readRichTextPlain } from './readProperty'

const THEME_CONFIG_SLUG = 'theme-config'

/** 按需刷新期间强制每次从数据源读取主题（避免 Serverless 进程内旧缓存） */
let revalidateFreshTheme = false

export function setRevalidateFreshTheme(enabled: boolean): void {
  revalidateFreshTheme = enabled
}

export function isRevalidateFreshTheme(): boolean {
  return revalidateFreshTheme
}

let remoteThemeCached: string | null | undefined
let remoteThemeInflight: Promise<string | null> | null = null

function findThemeConfigPage(
  pages: PageObjectResponse[]
): PageObjectResponse | undefined {
  return pages.find(
    (page) => readRichTextPlain(page.properties['slug']) === THEME_CONFIG_SLUG
  )
}

function filterPagesByType(
  objects: PageObjectResponse[],
  typeName: string
): PageObjectResponse[] {
  return objects.filter(
    (object) =>
      object.properties['type'].type === 'select' &&
      object.properties['type'].select?.name === typeName
  )
}

async function fetchRemoteThemeFromNotion(): Promise<string | null> {
  const scopes: ApiScope[] = [
    ApiScope.Home,
    ApiScope.Archive,
    ApiScope.Page,
    ApiScope.Draft,
  ]

  for (const scope of scopes) {
    const filter = combineScopeWithFilter(
      scope,
      slugEqualsFilter(THEME_CONFIG_SLUG)
    )
    const results = await queryDatabasePages(filter, { pageSize: 5 })
    for (const page of results) {
      const excerpt = readRichTextPlain(page.properties['excerpt'])
      if (excerpt) return excerpt
    }
  }

  for (const scope of scopes) {
    const objects = await getAll(scope)
    let themeConfigPage: PageObjectResponse | undefined

    if (scope === ApiScope.Page) {
      themeConfigPage = findThemeConfigPage(filterPagesByType(objects, 'Page'))
      if (!themeConfigPage) {
        themeConfigPage = findThemeConfigPage(objects)
      }
    } else if (scope === ApiScope.Home) {
      themeConfigPage = findThemeConfigPage(filterPagesByType(objects, 'Widget'))
      if (!themeConfigPage) {
        themeConfigPage = findThemeConfigPage(objects)
      }
    } else {
      themeConfigPage = findThemeConfigPage(filterPagesByType(objects, 'Post'))
      if (!themeConfigPage) {
        themeConfigPage = findThemeConfigPage(objects)
      }
    }

    if (themeConfigPage) {
      const excerpt = readRichTextPlain(themeConfigPage.properties['excerpt'])
      if (excerpt) return excerpt
    }
  }

  return null
}

/**
 * 读取 Notion 中 slug=theme-config 页面的 excerpt（v1 / v2 / gallery 等原始代号）。
 * 同一次 next build 内只请求 Notion 一次（Promise 去重）；失败时缓存 null，避免重试风暴。
 */
export const getRemoteTheme = async (): Promise<string | null> => {
  if (
    revalidateFreshTheme ||
    process.env.DISABLE_REMOTE_THEME_CACHE === '1'
  ) {
    try {
      return await fetchRemoteThemeFromNotion()
    } catch (e) {
      console.error('获取远程主题配置失败:', e)
      return null
    }
  }

  if (remoteThemeCached !== undefined) {
    return remoteThemeCached
  }

  if (!remoteThemeInflight) {
    remoteThemeInflight = fetchRemoteThemeFromNotion()
      .then((value) => {
        remoteThemeCached = value
        return value
      })
      .catch((e) => {
        console.error('获取远程主题配置失败:', e)
        remoteThemeCached = null
        return null
      })
      .finally(() => {
        remoteThemeInflight = null
      })
  }

  return remoteThemeInflight
}

/** 仅用于调试或测试；正常部署勿调用 */
export function clearRemoteThemeCache(): void {
  remoteThemeCached = undefined
  remoteThemeInflight = null
}

function isNotionContentType(
  object: PageObjectResponse,
  typeName: string
): boolean {
  return (
    object.properties['type'].type === 'select' &&
    object.properties['type'].select?.name === typeName
  )
}

function pickPostBySlugResults(
  results: PageObjectResponse[],
  scope: ApiScope.Archive | ApiScope.Draft
): PageObjectResponse | null {
  const posts = results.filter((object) => isNotionContentType(object, 'Post'))
  if (posts.length > 0) return posts[0]

  if (scope === ApiScope.Archive) {
    const pieces = results.filter((object) =>
      isNotionContentType(object, 'Piece')
    )
    if (pieces.length > 0) return pieces[0]
  }

  return null
}

function findPostPageBySlugInList(
  objects: PageObjectResponse[],
  slug: string
): PageObjectResponse | undefined {
  const trimmed = slug.trim()
  return objects.find(
    (object) => readRichTextPlain(object.properties['slug']) === trimmed
  )
}

/** 按 slug 查单篇（Archive / Draft）；Notion filter 未命中时回退内存匹配 */
export async function getPostBySlug(
  slug: string,
  scope: ApiScope.Archive | ApiScope.Draft
): Promise<PageObjectResponse | null> {
  const trimmed = slug.trim()
  if (!trimmed) return null

  const filter = combineScopeWithFilter(scope, slugEqualsFilter(trimmed))
  const results = await queryDatabasePages(filter, { pageSize: 5 })
  const picked = pickPostBySlugResults(results, scope)
  if (picked) return picked

  const objects = await getAll(scope)
  const fallback = findPostPageBySlugInList(objects, trimmed)
  if (!fallback) {
    console.warn(
      `[getPostBySlug] slug filter miss, not found in scope ${scope}: ${trimmed}`
    )
    return null
  }
  return pickPostBySlugResults([fallback], scope)
}

export const getPageBySlug = async (slug: string) => {
  const filter = combineScopeWithFilter(ApiScope.Page, slugEqualsFilter(slug))
  const results = await queryDatabasePages(filter, { pageSize: 1 })
  const page =
    results.find((object) => isNotionContentType(object, 'Page')) ?? null
  return page ?? (null as unknown as PageObjectResponse)
}

export const getPages = async () => {
  const objects = await getAll(ApiScope.Page)
  return objects.filter(
    (object) =>
      object.properties['type'].type === 'select' &&
      object.properties['type'].select?.name === 'Page'
  )
}

export const getPosts = async (
  scope: ApiScope.Home | ApiScope.Archive | ApiScope.Draft
) => {
  const objects = await getAll(scope)
  return objects.filter(
    (object) =>
      object.properties['type'].type === 'select' &&
      object.properties['type'].select?.name === 'Post'
  )
}

export const getPostsAndPieces = async (
  scope: ApiScope.Home | ApiScope.Archive | ApiScope.Draft
) => {
  const objects = await getAll(scope)
  return {
    posts: objects.filter(
      (object) =>
        object.properties['type'].type === 'select' &&
        object.properties['type'].select?.name === 'Post'
    ),
    pieces: objects.filter(
      (object) =>
        object.properties['type'].type === 'select' &&
        object.properties['type'].select?.name === 'Piece'
    ),
  }
}

export const getWidgets = async () => {
  const objects = await getAll(ApiScope.Home)
  return objects.filter(
    (object) =>
      object.properties['type'].type === 'select' &&
      object.properties['type'].select?.name === 'Widget'
  )
}