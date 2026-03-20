"use client";

import { useUpload } from "@/context/UploadContext";

/**
 * Fixed floating toast that shows background upload progress.
 * Renders in the bottom-right corner across all tabs.
 */
export function UploadToast() {
  const { uploadState, dismiss } = useUpload();

  if (uploadState.status === "idle") return null;

  const isUploading = uploadState.status === "uploading";
  const isError = uploadState.status === "error";

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm max-w-sm transition-all
        ${
          isUploading
            ? "border-indigo-200 bg-indigo-50 text-indigo-800"
            : isError
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-green-200 bg-green-50 text-green-800"
        }`}
    >
      {/* Icon / Spinner */}
      <span className="text-lg shrink-0 mt-0.5">
        {isUploading ? (
          <span className="inline-block animate-spin">⏳</span>
        ) : isError ? (
          "❌"
        ) : (
          "✅"
        )}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {isUploading
            ? `上傳中：${uploadState.filename}`
            : uploadState.message}
        </p>
        {isUploading && (
          <p className="text-xs opacity-70 mt-0.5">
            可以自由切換頁面，上傳繼續進行中...
          </p>
        )}
      </div>

      {/* Dismiss button — only shown after upload finishes */}
      {!isUploading && (
        <button
          onClick={dismiss}
          className="shrink-0 text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
          aria-label="關閉"
        >
          ×
        </button>
      )}
    </div>
  );
}
