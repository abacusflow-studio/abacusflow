"use client";

import React, { useEffect } from "react";
import { getAuthClient } from "@abacusflow/core";

export default function CallbackPage() {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        const auth = getAuthClient();
        await auth.handleRedirectCallback();

        const returnTo = sessionStorage.getItem("auth_return_to") || "/dashboard";
        sessionStorage.removeItem("auth_return_to");
        window.location.href = returnTo;
      } catch (err) {
        console.error("[callback] error:", err);
        window.location.href = "/login";
      }
    };
    handleCallback();
  }, []);

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
