import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bootcamp Revision App",
  description: "AI-powered revision app for Bootcamp PDFs",
};

/**
 * Next.js 根 Layout — 設定 HTML、全域樣式、及 `zh-TW` 語言屬性。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-slate-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
