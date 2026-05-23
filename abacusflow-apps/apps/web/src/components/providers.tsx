"use client";

import { useEffect, useState } from "react";
import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { initWebAuth } from "../lib/auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initWebAuth()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("[providers] initWebAuth failed:", err);
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 6,
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
