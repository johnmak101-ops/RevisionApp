import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Bootcamp Revision App",
  description: "AI-powered revision app for Bootcamp PDFs",
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
