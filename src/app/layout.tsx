import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "気仙沼市 政策・予算ダッシュボード",
  description:
    "気仙沼市の予算・決算・主要施策の成果を事業単位で経年比較できるダッシュボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-[#f9f9f7] text-[#0b0b0b] antialiased">
        {children}
      </body>
    </html>
  );
}
