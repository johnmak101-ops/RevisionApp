import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Revision App｜單人溫書",
  description:
    "提升單人溫書效率：上傳 PDF／Markdown，RAG 問答、自動 Quiz、知識缺口與 AI 摘要。",
};

/**
 * App Root Layout — 設定 HTML lang、metadata、全域 CSS 及 Providers。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-slate-50" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
