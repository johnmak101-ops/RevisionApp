"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { UploadProvider } from "@/context/UploadContext";
import { UploadToast } from "@/components/UploadToast";

/**
 * Bundles all client-side providers so RootLayout can stay a Server Component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Create a stable QueryClient per session (not per render)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,        // 30s before refetch on mount
        gcTime: 5 * 60 * 1000,   // 5min garbage-collect
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <UploadProvider>
        {children}
        <UploadToast />
      </UploadProvider>
    </QueryClientProvider>
  );
}
