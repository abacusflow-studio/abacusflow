"use client";

import { useEffect, useState } from "react";
import { initWebAuth } from "../lib/auth-provider";
import { ToastProvider } from "./toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initWebAuth()
      .then(() => setReady(true))
      .catch((err) => {
        console.error("[providers] initWebAuth failed:", err);
        setReady(true); // still render children so login page can work
      });
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        加载中...
      </div>
    );
  }

  return <ToastProvider>{children}</ToastProvider>;
}
