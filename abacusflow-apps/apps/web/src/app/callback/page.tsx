"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Handle Auth0 callback and redirect to dashboard
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 32 }}>⏳</div>
      <p style={{ color: "#666", fontSize: 16 }}>正在处理登录回调...</p>
    </div>
  );
}
