/** 预加载一批图库缩略图，全部完成（或失败）后 resolve */
export function preloadGalleryImages(sources: string[]): Promise<void> {
  if (!sources.length) return Promise.resolve()

  return Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          if (!src) {
            resolve()
            return
          }
          const img = new Image()
          const done = () => resolve()
          img.onload = done
          img.onerror = done
          img.src = src
        })
    )
  ).then(() => undefined)
}
