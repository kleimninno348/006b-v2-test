import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'

type GalleryDownloadModalProps = {
  open: boolean
  content: string
  postTitle?: string
  onClose: () => void
}

function parseDownloadContent(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return { isEmpty: true, label: '', url: '' as string | undefined }

  const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/i)
  const url = urlMatch?.[0]?.replace(/[.,;:!?)]+$/, '')
  let label = trimmed
  if (url) {
    label = trimmed.replace(url, '').replace(/[-–—:|：]\s*$/, '').trim()
  }
  return {
    isEmpty: false,
    label: label || '下载资源',
    url,
  }
}

/** 浅色主题标准下载图标（描边、向下箭头 + 底栏） */
function DownloadOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v10" />
      <path d="m8 11 4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  )
}

export const GalleryDownloadModal = ({
  open,
  content,
  postTitle,
  onClose,
}: GalleryDownloadModalProps) => {
  const parsed = useMemo(() => parseDownloadContent(content), [content])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const isEmpty = parsed.isEmpty

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-neutral-900/20 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gallery-download-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 ${
              isEmpty ? 'bg-neutral-50 text-neutral-400' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            <DownloadOutlineIcon />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2
              id="gallery-download-title"
              className="text-[16px] font-semibold text-neutral-900"
            >
              {isEmpty ? '暂无下载' : '下载信息'}
            </h2>
            {postTitle && !isEmpty ? (
              <p className="mt-0.5 truncate text-[13px] text-neutral-500">{postTitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="关闭"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5">
          {isEmpty ? (
            <p className="text-center text-[14px] leading-relaxed text-neutral-500">
              该内容暂未添加下载信息。
              <br />
              请联系站长。
            </p>
          ) : (
            <div className="space-y-3">
              {parsed.label ? (
                <p className="text-[14px] leading-relaxed text-neutral-800">{parsed.label}</p>
              ) : null}
              {parsed.url ? (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                    链接
                  </p>
                  <a
                    href={parsed.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-[13px] font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-900"
                  >
                    {parsed.url}
                  </a>
                </div>
              ) : (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
                  <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-neutral-800">
                    {content.trim()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-neutral-100 px-5 py-4">
          {!isEmpty && parsed.url ? (
            <a
              href={parsed.url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center rounded-lg bg-neutral-900 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-neutral-800"
            >
              打开链接
            </a>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg border border-neutral-200 bg-white py-2.5 text-[14px] font-semibold text-neutral-800 transition-colors hover:bg-neutral-50 ${
              !isEmpty && parsed.url ? 'flex-1' : 'w-full'
            }`}
          >
            关闭
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
