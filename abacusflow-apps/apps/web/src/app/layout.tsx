import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小算盘 - AbacusFlow Admin",
  description: "AbacusFlow inventory management admin panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
