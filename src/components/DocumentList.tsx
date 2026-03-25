"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface DocRow {
  _id: string;
  filename: string;
  chunkCount: number;
}

async function fetchDocuments(): Promise<DocRow[]> {
  const res = await fetch("/api/documents");
  if (!res.ok) throw new Error("無法載入文件清單");
  return res.json();
}

/**
 * 已索引文件清單 — 可刪除單筆以釋放索引或解決同名 409。
 */
export function DocumentList() {
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading, isError } = useQuery({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "刪除失敗");
      return data as { deletedChunks: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  if (isLoading) {
    return (
      <p className="text-xs text-slate-500 mt-3">載入文件清單…</p>
    );
  }

  if (isError) {
    return (
      <p className="text-xs text-red-600 mt-3">無法載入文件清單</p>
    );
  }

  if (docs.length === 0) {
    return (
      <p className="text-xs text-slate-500 mt-3">尚未有已索引文件</p>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50/80 px-3 py-2">
      <p className="text-xs font-semibold text-slate-600 mb-2">已索引文件</p>
      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
        {docs.map((d) => (
          <li
            key={d._id}
            className="flex items-center justify-between gap-2 text-sm text-slate-700"
          >
            <span className="truncate" title={d.filename}>
              {d.filename}
              <span className="text-slate-400 ml-1">({d.chunkCount})</span>
            </span>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!confirm(`確定刪除「${d.filename}」？此操作無法還原。`)) return;
                deleteMutation.mutate(d._id);
              }}
              className="shrink-0 rounded px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
            >
              刪除
            </button>
          </li>
        ))}
      </ul>
      {deleteMutation.isError && (
        <p className="text-xs text-red-600 mt-2">
          {(deleteMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}
