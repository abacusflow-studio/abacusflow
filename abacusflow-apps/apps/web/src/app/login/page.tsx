"use client";

import React, { useState } from "react";
import { Button } from "@abacusflow/ui";
import { getAuthClient } from "@abacusflow/core";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const auth = getAuthClient();
      await auth.login("/dashboard");
    } catch (err) {
      console.error("[login] error:", err);
      setError("登录失败，请重试");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 40,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          textAlign: "center",
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "#1677ff", fontSize: 32, fontWeight: "bold", marginBottom: 8 }}>
            小算盘
          </h1>
          <h3 style={{ color: "#666", fontSize: 16, margin: 0 }}>AbacusFlow Admin</h3>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Button
            type="primary"
            size="large"
            label={loading ? "跳转中..." : "使用 Auth0 登录"}
            loading={loading}
            onClick={handleLogin}
            block
          />
          {error && (
            <div
              style={{
                marginTop: 16,
                padding: "8px 12px",
                background: "#fff2f0",
                border: "1px solid #ffccc7",
                borderRadius: 6,
                color: "#ff4d4f",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 20 }}>
          <p style={{ color: "#999", fontSize: 14, margin: 0 }}>
            © 2025 AbacusFlow. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
