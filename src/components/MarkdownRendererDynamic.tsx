"use client";

import dynamic from "next/dynamic";
import type { MarkdownRendererProps } from "./MarkdownRenderer";

/**
 * MarkdownRenderer 的動態載入版本（`ssr: false`）。
 *
 * MarkdownRenderer 依賴 DOMPurify 和 highlight.js 等瀏覽器 API，
 * 無法在 Node.js SSR 環境執行，因此必須用 `next/dynamic` 延遲載入。
 */
const MarkdownRendererDynamic = dynamic<MarkdownRendererProps>(
  () => import("./MarkdownRenderer"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse text-xs text-slate-400 py-2">Loading…</div>
    ),
  }
);

export default MarkdownRendererDynamic;
