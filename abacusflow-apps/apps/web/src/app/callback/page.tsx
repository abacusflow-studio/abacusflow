"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthClient } from "@abacusflow/core";

let isHandlingCallback = false;

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      if (isHandlingCallback) return;
      isHandlingCallback = true;

      try {
        const auth = getAuthClient();
        await auth.handleRedirectCallback();

        const returnTo =
          sessionStorage.getItem("auth_return_to") || "/dashboard";
        sessionStorage.removeItem("auth_return_to");
        router.replace(returnTo);
      } catch (err) {
        console.error("[callback] error:", err);
        router.replace("/login");
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
      <div style={{ fontSize: 32 }}>⏳</div>
      <p style={{ color: "#666", fontSize: 16 }}>正在处理登录回调...</p>
    </div>
  );
}
