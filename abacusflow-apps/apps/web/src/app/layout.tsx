import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";
import { Providers } from "../components/providers";
import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-fira-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-fira-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "小算盘 | 业务指挥台",
  description: "小算盘智能库存与交易指挥台",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body
        className={`${firaSans.variable} ${firaCode.variable} af-root-body`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
