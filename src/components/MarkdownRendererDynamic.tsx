"use client";

import dynamic from "next/dynamic";
import type { MarkdownRendererProps } from "./MarkdownRenderer";

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
