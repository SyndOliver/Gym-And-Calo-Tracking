"use client";

import { useEffect } from "react";
import { X, ExternalLink, Search } from "lucide-react";
import { parseVideoUrl, youtubeSearchUrl } from "@/lib/video";

type Props = {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  videoUrl?: string | null;
};

export default function VideoModal({ open, onClose, exerciseName, videoUrl }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const info = parseVideoUrl(videoUrl);
  const searchUrl = youtubeSearchUrl(exerciseName);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-t-2xl sm:rounded-2xl border border-border bg-card overflow-hidden animate-slide-up shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              ▶ Video hướng dẫn
            </p>
            <h3 className="font-bold truncate">{exerciseName}</h3>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon shrink-0" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        {info.source === "youtube" && info.embedUrl ? (
          <>
            <div className="relative w-full bg-black" style={{ aspectRatio: "16 / 9" }}>
              <iframe
                src={info.embedUrl + "&autoplay=1"}
                title={exerciseName}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className="p-3 sm:p-4 flex items-center justify-end gap-2">
              <a
                href={info.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary text-sm"
              >
                <ExternalLink className="h-4 w-4" /> Mở trên YouTube
              </a>
            </div>
          </>
        ) : info.source === "url" && info.watchUrl ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-muted">Video không thể nhúng trực tiếp</p>
            <a
              href={info.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary inline-flex"
            >
              <ExternalLink className="h-4 w-4" /> Mở video
            </a>
          </div>
        ) : (
          <div className="p-6 text-center space-y-4">
            <div className="text-5xl">📹</div>
            <div className="space-y-1">
              <p className="font-medium">Bài tập này chưa có video</p>
              <p className="text-xs text-muted">
                Bạn có thể tìm trên YouTube hoặc thêm link video trong trang chi tiết bài tập.
              </p>
            </div>
            <a
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary inline-flex"
            >
              <Search className="h-4 w-4" /> Tìm "{exerciseName}" trên YouTube
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
