"use client";

import { useEffect } from "react";
import { initWebAuth } from "../lib/auth-provider";
import { ToastProvider } from "./toast";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initWebAuth();
  }, []);

  return <ToastProvider>{children}</ToastProvider>;
}
