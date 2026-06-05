/** Vercel Serverless 请求体硬上限约 4.5MB，留余量走代理 */
const PROXY_SAFE_BYTES = 3.5 * 1024 * 1024

/** 图库上传：长边上限与目标体积（节约图床空间） */
const GALLERY_MAX_DIM = 2048
const GALLERY_TARGET_BYTES = 1.2 * 1024 * 1024
const GALLERY_SKIP_BYTES = 380 * 1024

function isLocalDevHost() {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
}

async function readResponseBody(res) {
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    const msg = json.message || json.error || ''
    if (/csrf/i.test(msg)) {
      throw new Error(
        '兰空 CSRF 校验失败。请确认走服务端代理上传，勿在浏览器直传 Bearer Token。'
      )
    }
    return { json, text }
  } catch (e) {
    if (e.message?.includes('CSRF')) throw e
    if (/request entity too large|payload too large|413|FUNCTION_PAYLOAD/i.test(text)) {
      const err = new Error('VERCEL_PAYLOAD_TOO_LARGE')
      err.raw = text
      throw err
    }
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`)
  }
}

async function loadImageFromFile(file) {
  const objectUrl = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('无法读取图片'))
      el.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/**
 * 通用浏览器端 JPEG 压缩
 */
async function compressImageFile(
  file,
  { maxBytes, maxDim, minQuality = 0.42 }
) {
  if (file.size <= maxBytes) return file

  const mime = file.type || ''
  if (!/^image\//i.test(mime)) {
    throw new Error(
      `文件约 ${(file.size / 1024 / 1024).toFixed(1)}MB，超过单张限制，请先压缩后再上传`
    )
  }

  const img = await loadImageFromFile(file)

  let width = img.naturalWidth
  let height = img.naturalHeight
  let dimCap = maxDim

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('浏览器无法处理图片压缩')

  let quality = 0.88
  let blob = null

  for (let attempt = 0; attempt < 12; attempt++) {
    let w = width
    let h = height
    if (w > dimCap || h > dimCap) {
      const ratio = Math.min(dimCap / w, dimCap / h)
      w = Math.round(w * ratio)
      h = Math.round(h * ratio)
    }

    canvas.width = w
    canvas.height = h
    ctx.drawImage(img, 0, 0, w, h)

    blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality)
    })

    if (blob && blob.size <= maxBytes) break

    if (quality > minQuality) {
      quality -= 0.07
    } else {
      width = Math.round(w * 0.84)
      height = Math.round(h * 0.84)
      dimCap = Math.max(width, height)
      quality = 0.8
    }
  }

  if (!blob || blob.size > maxBytes) {
    throw new Error('图片过大，自动压缩后仍超过限制，请手动压缩后再试')
  }

  const baseName = (file.name || 'image').replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  })
}

/**
 * 图库专用压缩：兰空标准 API 不会自动压缩，由上传前在浏览器处理
 */
export async function compressImageForGallery(file) {
  if (!file || !/^image\//i.test(file.type || '')) return file

  const img = await loadImageFromFile(file)
  const maxSide = Math.max(img.naturalWidth, img.naturalHeight)
  if (file.size <= GALLERY_SKIP_BYTES && maxSide <= GALLERY_MAX_DIM) {
    return file
  }

  const compressed = await compressImageFile(file, {
    maxBytes: GALLERY_TARGET_BYTES,
    maxDim: GALLERY_MAX_DIM,
    minQuality: 0.5,
  })

  if (!isLocalDevHost() && compressed.size > PROXY_SAFE_BYTES) {
    return compressImageFile(compressed, {
      maxBytes: PROXY_SAFE_BYTES,
      maxDim: GALLERY_MAX_DIM,
      minQuality: 0.45,
    })
  }

  return compressed
}

async function uploadViaProxy(file) {
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: {
      'content-type': file.type || 'application/octet-stream',
      'x-file-name': encodeURIComponent(file.name || 'image.png'),
    },
    body: file,
    credentials: 'same-origin',
  })
  const { json } = await readResponseBody(res)
  if (!json.success) throw new Error(json.error || '上传失败')
  return json.url
}

async function prepareFileForUpload(file) {
  if (isLocalDevHost()) return file
  if (file.size <= PROXY_SAFE_BYTES) return file
  return compressImageFile(file, {
    maxBytes: PROXY_SAFE_BYTES,
    maxDim: 4096,
    minQuality: 0.42,
  })
}

/**
 * 智能上传（封面/正文等）：
 * - 本地：原图走服务端代理
 * - 线上大图：先压缩到 ≤3.5MB，再服务端代理
 */
export async function uploadImageToLsky(file) {
  if (!file) throw new Error('未选择文件')

  let prepared = await prepareFileForUpload(file)

  try {
    return await uploadViaProxy(prepared)
  } catch (e) {
    if (e.message === 'VERCEL_PAYLOAD_TOO_LARGE' && !isLocalDevHost()) {
      prepared = await compressImageFile(file, {
        maxBytes: Math.floor(PROXY_SAFE_BYTES * 0.75),
        maxDim: 4096,
        minQuality: 0.42,
      })
      return uploadViaProxy(prepared)
    }
    throw e
  }
}

/**
 * 图库批量上传：先压缩再上传（并行由调用方控制）
 */
export async function uploadGalleryImageToLsky(file) {
  if (!file) throw new Error('未选择文件')
  const prepared = await compressImageForGallery(file)
  return uploadViaProxy(prepared)
}

/** 限制并发数的批量任务 */
export async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let index = 0

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (index < items.length) {
        const i = index++
        results[i] = await mapper(items[i], i)
      }
    }
  )

  await Promise.all(workers)
  return results
}
