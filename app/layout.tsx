import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Data Report Assistant",
  description: "Upload CSV data and generate a business analysis report."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
