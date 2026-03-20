import { useCallback, useRef, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  msg: string;
  type: ToastType;
}

/**
 * Reusable auto-dismiss toast hook.
 * Clears any existing timer before starting a new one (prevents stale timeouts).
 */
export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, type: ToastType = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, type });
    timer.current = setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  return { toast, showToast };
}
