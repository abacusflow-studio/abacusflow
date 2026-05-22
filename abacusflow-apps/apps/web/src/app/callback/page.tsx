"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@abacusflow/core";

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const auth = getAuthClient();
        await auth.handleRedirectCallback();
        const returnTo = sessionStorage.getItem("auth_return_to") || "/dashboard";
        sessionStorage.removeItem("auth_return_to");
        router.push(returnTo);
      } catch (err) {
        setError(err instanceof Error ? err.message : "登录处理失败");
        setTimeout(() => router.push("/login"), 2000);
      }
    };
    handleCallback();
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
      {error ? (
        <>
          <div style={{ fontSize: 32 }}>❌</div>
          <p style={{ color: "#ff4d4f", fontSize: 16 }}>{error}</p>
          <p style={{ color: "#999", fontSize: 14 }}>正在返回登录页...</p>
        </>
      ) : (
        <>
          <div style={{ fontSize: 32 }}>⏳</div>
          <p style={{ color: "#666", fontSize: 16 }}>正在处理登录回调...</p>
        </>
      )}
    </div>
  );
}
