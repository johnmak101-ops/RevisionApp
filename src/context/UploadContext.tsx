"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// ── Types ────────────────────────────────────────────────────────────────────

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export interface UploadState {
  status: UploadStatus;
  filename: string;
  message: string;
}

interface UploadContextValue {
  uploadState: UploadState;
  /** Fire-and-forget — caller does NOT need to `await` */
  startUpload: (file: File) => void;
  dismiss: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const UploadContext = createContext<UploadContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

/**
 * Wrap your app with this provider so any component can access upload state
 * and trigger background uploads.
 */
export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    filename: "",
    message: "",
  });

  // Guard against running two uploads at once
  const abortRef = useRef<AbortController | null>(null);

  const startUpload = useCallback((file: File) => {
    // Cancel any previous in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setUploadState({ status: "uploading", filename: file.name, message: "" });

    const formData = new FormData();
    formData.append("file", file);

    // 🔑 No `await` here — runs entirely in the background
    fetch("/api/ingest", {
      method: "POST",
      body: formData,
      signal: abortRef.current.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setUploadState({
          status: "success",
          filename: file.name,
          message: `✅ ${file.name} — ${data.chunkCount} 個區塊已索引`,
        });
      })
      .catch((err) => {
        // Ignore abort errors (user navigated / cancelled intentionally)
        if (err?.name === "AbortError") return;
        setUploadState({
          status: "error",
          filename: file.name,
          message: `❌ ${err instanceof Error ? err.message : "上傳失敗"}`,
        });
      });
  }, []);

  const dismiss = useCallback(() => {
    setUploadState({ status: "idle", filename: "", message: "" });
  }, []);

  return (
    <UploadContext.Provider value={{ uploadState, startUpload, dismiss }}>
      {children}
    </UploadContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useUpload(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used inside <UploadProvider>");
  return ctx;
}
