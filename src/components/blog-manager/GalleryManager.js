import { useCallback, useEffect, useState } from 'react'
import {
  mapWithConcurrency,
  uploadGalleryImageToLsky,
} from '@/src/lib/admin/lskyClientUpload'

const UPLOAD_CONCURRENCY = 4

const btnSpinStyle = {
  width: '14px',
  height: '14px',
  border: '2px solid rgba(0,0,0,0.15)',
  borderTopColor: '#000',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  display: 'inline-block',
}

/**
 * Gallery 商用图库：批量上传兰空 + 写入 Supabase
 */
export function GalleryManager({ postSlug, postTitle, postNotionId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [saving, setSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [error, setError] = useState('')

  const slug = (postSlug || '').trim()

  const loadGallery = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/admin/gallery?slug=${encodeURIComponent(slug)}`)
      const d = await r.json()
      if (!d.success) throw new Error(d.error || '加载失败')
      setItems((d.images || []).map((img) => ({ id: img.id, url: img.url })))
    } catch (e) {
      setError(e.message)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadGallery()
  }, [loadGallery])

  const persistGallery = async (nextItems) => {
    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postSlug: slug,
        postNotionId: postNotionId || null,
        title: postTitle || null,
        images: nextItems.map((it) => ({ url: it.url })),
      }),
    })
    const d = await res.json()
    if (!d.success) throw new Error(d.error || '保存失败')
    return d
  }

  const saveGallery = async (itemsOverride) => {
    if (!slug) {
      alert('请先保存文章（生成 slug）后再保存图库')
      return
    }
    const payload = itemsOverride ?? items
    setSaving(true)
    setSaveDone(false)
    setError('')
    try {
      await persistGallery(payload)
      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 2500)
      await loadGallery()
    } catch (e) {
      setError(e.message)
      alert('图库保存失败：' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      /^image\//i.test(f.type)
    )
    if (!files.length) return
    if (!slug) {
      alert('请先保存文章一次（需要 slug），再上传图库')
      return
    }
    setUploading(true)
    setUploadProgress({ done: 0, total: files.length })
    setError('')
    try {
      let done = 0
      const urls = await mapWithConcurrency(
        files,
        UPLOAD_CONCURRENCY,
        async (file) => {
          const url = await uploadGalleryImageToLsky(file)
          done += 1
          setUploadProgress({ done, total: files.length })
          return url
        }
      )

      const nextItems = [
        ...items,
        ...urls.map((url) => ({ id: `local-${url}`, url })),
      ]
      setItems(nextItems)
      await persistGallery(nextItems)
      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 2500)
      await loadGallery()
    } catch (e) {
      setError(e.message)
      alert('图库上传失败：' + e.message)
    } finally {
      setUploading(false)
      setUploadProgress({ done: 0, total: 0 })
    }
  }

  const removeAt = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const move = (index, dir) => {
    setItems((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  if (!slug) {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: '10px',
          background: '#2a2a2e',
          color: '#999',
          fontSize: '13px',
          lineHeight: 1.6,
        }}
      >
        请先点击底部「确认发布 / 保存修改」生成文章 slug 后，再管理图库。
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px', lineHeight: 1.7 }}>
        图片上传到<b style={{ color: '#ccc' }}>兰空图床</b>（上传前自动压缩，节约空间），清单保存在
        <b style={{ color: '#ccc' }}> Supabase</b>，上传完成后<b style={{ color: '#ccc' }}>自动保存</b>。前台
        Gallery 内页分页展示。作品标识：
        <code style={{ color: 'greenyellow' }}>{slug}</code>
      </p>

      <label
        className="img-drop"
        style={{ minHeight: '100px', marginBottom: '16px' }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        {uploading ? (
          <div className="img-uploading">
            <div className="img-spin" />
            <div>
              压缩并上传中… {uploadProgress.done}/{uploadProgress.total}
            </div>
          </div>
        ) : (
          <div style={{ pointerEvents: 'none', textAlign: 'center' }}>
            <div style={{ fontSize: '15px', color: '#fff', marginBottom: '6px' }}>
              拖拽或点击 · 批量上传图库
            </div>
            <div style={{ fontSize: '12px', color: '#777' }}>
              支持多选 · 自动压缩 · 上传后自动写入数据库
            </div>
          </div>
        )}
      </label>

      {loading ? (
        <div style={{ color: '#888', fontSize: '13px', padding: '12px 0' }}>加载图库…</div>
      ) : null}
      {error ? (
        <div style={{ color: '#ff7875', fontSize: '12px', marginBottom: '10px' }}>{error}</div>
      ) : null}

      {items.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          {items.map((it, index) => (
            <div
              key={`${it.url}-${index}`}
              style={{
                position: 'relative',
                aspectRatio: '3/4',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#222',
                border: '1px solid #444',
              }}
            >
              <img
                src={it.url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '0 0 auto 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '4px',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
                }}
              >
                <span style={{ fontSize: '10px', color: '#fff' }}>{index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  style={{
                    border: 'none',
                    background: 'rgba(0,0,0,0.5)',
                    color: '#ff7875',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '0 4px',
                  }}
                >
                  ×
                </button>
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  right: '4px',
                  display: 'flex',
                  gap: '4px',
                  justifyContent: 'center',
                }}
              >
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  style={{
                    flex: 1,
                    fontSize: '10px',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 0',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    opacity: index === 0 ? 0.4 : 1,
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  style={{
                    flex: 1,
                    fontSize: '10px',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 0',
                    cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: index === items.length - 1 ? 0.4 : 1,
                  }}
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            color: '#666',
            padding: '24px',
            border: '2px dashed #444',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          暂无图库图片
        </div>
      )}

      <button
        type="button"
        onClick={() => saveGallery()}
        disabled={saving || uploading}
        style={{
          width: '100%',
          padding: '14px',
          background: saveDone ? '#4dab6d' : 'greenyellow',
          color: saveDone ? '#fff' : '#000',
          border: 'none',
          borderRadius: '10px',
          fontWeight: 'bold',
          fontSize: '14px',
          cursor: saving || uploading ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {saving ? (
          <>
            <span style={btnSpinStyle} />
            保存图库中…
          </>
        ) : saveDone ? (
          '✓ 图库已保存'
        ) : (
          `手动保存排序（${items.length} 张）`
        )}
      </button>
    </div>
  )
}
