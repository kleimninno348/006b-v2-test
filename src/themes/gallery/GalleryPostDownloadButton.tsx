'use client'

import { useState } from 'react'
import { GalleryDownloadModal } from './GalleryDownloadModal'

type GalleryPostDownloadButtonProps = {
  postTitle: string
  downloadContent: string
}

/** 文章内页右上角「作品下载」，与首页卡片下载按钮共用弹窗逻辑 */
export function GalleryPostDownloadButton({
  postTitle,
  downloadContent,
}: GalleryPostDownloadButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-[14px] font-bold text-white transition-colors hover:bg-neutral-800 active:bg-neutral-900"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/themes/gallery/download-cloud-icon.png"
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] shrink-0 brightness-0 invert"
          aria-hidden
        />
        下载
      </button>
      <GalleryDownloadModal
        open={open}
        postTitle={postTitle}
        content={downloadContent}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
