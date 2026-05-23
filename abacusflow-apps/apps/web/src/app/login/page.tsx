"use client";

import React, { useRef, useState } from "react";
import { Button } from "antd";
import {
  BarChartOutlined,
  CalculatorOutlined,
  DatabaseOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { getAuthClient } from "@abacusflow/core";
import { useMouseGlow } from "../../hooks/use-mouse-glow";

const BOARD_LANES = [
  { label: "采购入库", value: "84%", color: "#22c55e" },
  { label: "库存同步", value: "67%", color: "#38bdf8" },
  { label: "销售出库", value: "92%", color: "#f59e0b" },
  { label: "风险预警", value: "11%", color: "#fb7185" },
];

const INSIGHTS = [
  { label: "流转监测", value: "全天" },
  { label: "库存信号", value: "实时" },
  { label: "异常响应", value: "小于1分" },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
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
    <main className="af-login-page">
      <section className="af-login-showcase" aria-label="小算盘概览">
        <div className="af-kicker">小算盘业务指挥台</div>
        <h1 className="af-login-title af-gradient-text">
          让库存流转像脉冲
          <br />
          一样清晰
        </h1>
        <p className="af-login-copy">
          小算盘把产品、库存、采购、销售和伙伴网络压缩进一张实时业务面板，
          让团队在高频出入库里保持判断速度。
        </p>

        <div className="af-login-insights">
          {INSIGHTS.map((item) => (
            <div className="af-insight-tile" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>

        <div className="af-flow-board af-gradient-border" aria-hidden="true">
          <div className="af-board-header">
            <span>流转矩阵</span>
            <span>同步中</span>
          </div>
          <div className="af-board-lanes">
            {BOARD_LANES.map((lane) => (
              <div
                className="af-board-lane"
                key={lane.label}
                style={{ "--lane-color": lane.color } as React.CSSProperties}
              >
                <span>{lane.label}</span>
                <strong>{lane.value}</strong>
              </div>
            ))}
          </div>
          <div className="af-board-footer">
            <span>统一认证网关</span>
            <span>小算盘云</span>
          </div>
        </div>
      </section>

      <section ref={cardRef} className="af-login-card af-mouse-glow af-gradient-border" aria-label="登录">
        <div className="af-login-brand">
          <div className="af-brand-mark">
            <CalculatorOutlined />
          </div>
          <div className="af-brand-copy">
            <strong>小算盘</strong>
            <span>库存智能中枢</span>
          </div>
        </div>

        <h2 className="af-login-panel-title">进入业务指挥台</h2>
        <p className="af-login-panel-copy">
          通过统一身份认证安全登录，继续管理库存、订单和伙伴数据。
        </p>

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
