"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthClient, type AuthClient } from "@abacusflow/core";

let callbackPromise: Promise<void> | null = null;

function completeCallbackOnce(auth: AuthClient): Promise<void> {
  if (!callbackPromise) {
    callbackPromise = (async () => {
      await auth.handleRedirectCallback();
      if (!(await auth.isAuthenticated())) {
        throw new Error("Authentication callback completed without a session.");
      }
    })().catch((error) => {
      // 真实失败后允许刷新页面重试；React Strict Mode 的重复 Effect 会共享同一个 Promise。
      callbackPromise = null;
      throw error;
    });
  }
  return callbackPromise;
}

function consumeReturnTo(): string {
  const value = sessionStorage.getItem("auth_return_to");
  sessionStorage.removeItem("auth_return_to");

  // 只允许站内绝对路径，避免错误值再次把用户送回登录或回调页。
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/login") ||
    value.startsWith("/callback")
  ) {
    return "/dashboard";
  }
  return value;
}

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        const auth = getAuthClient();
        await completeCallbackOnce(auth);
        if (!cancelled) {
          router.replace(consumeReturnTo());
        }
      } catch (err) {
        console.error("[callback] error:", err);
        if (!cancelled) {
          sessionStorage.removeItem("auth_return_to");
          router.replace("/login");
        }
      }
    };
    void handleCallback();

    return () => {
      cancelled = true;
    };
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
