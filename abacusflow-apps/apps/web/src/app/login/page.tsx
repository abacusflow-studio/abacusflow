"use client";

import React, { useRef, useState } from "react";
import { Button } from "antd";
import {
  BarChartOutlined,
  CalculatorOutlined,
  DatabaseOutlined,
  LockOutlined,
  MoonOutlined,
  SafetyCertificateOutlined,
  SunOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { getAuthClient } from "@abacusflow/core";
import { useMouseGlow } from "../../hooks/use-mouse-glow";
import { useTheme } from "../../components/providers";
import { ParticleNetwork } from "../../components/particle-network";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { themeMode, toggleTheme } = useTheme();
  useMouseGlow(cardRef);

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
    <main className="af-login-immersive">
      <ParticleNetwork />

      <button
        type="button"
        className="af-theme-toggle af-login-theme-toggle"
        aria-label={themeMode === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        onClick={toggleTheme}
      >
        {themeMode === "dark" ? <SunOutlined /> : <MoonOutlined />}
      </button>

      <div className="af-login-hero-text">
        <h1 className="af-login-title af-gradient-text">
          让库存流转像脉冲一样清晰
        </h1>
        <p className="af-login-copy">
          小算盘把产品、库存、采购、销售和伙伴网络压缩进一张实时业务面板，
          让团队在高频出入库里保持判断速度。
        </p>
      </div>

      <section ref={cardRef} className="af-login-floating-card af-mouse-glow af-gradient-border" aria-label="登录">
        <div className="af-login-brand">
          <div className="af-brand-mark">
            <CalculatorOutlined />
          </div>
          <div className="af-brand-copy">
            <strong>小算盘</strong>
            <span>库存智能中枢</span>
          </div>
        </div>

        <Button
          type="primary"
          size="large"
          loading={loading}
          onClick={handleLogin}
          block
          icon={<LockOutlined />}
          className="af-login-button"
        >
          {loading ? "正在跳转..." : "使用统一身份认证登录"}
        </Button>

        {error && <div className="af-login-error">{error}</div>}

        <div className="af-login-checks">
          <div className="af-login-check">
            <SafetyCertificateOutlined />
            <span>企业身份验证已启用</span>
          </div>
          <div className="af-login-check">
            <DatabaseOutlined />
            <span>库存数据实时同步</span>
          </div>
          <div className="af-login-check">
            <ThunderboltOutlined />
            <span>关键业务信号快速响应</span>
          </div>
        </div>

        <div className="af-login-footer">
          <BarChartOutlined /> 小算盘 © 2026
        </div>
      </section>
    </main>
  );
}
