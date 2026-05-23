import type { Metadata } from "next";
import { Providers } from "../components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "小算盘 - AbacusFlow Admin",
  description: "AbacusFlow inventory management admin panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
