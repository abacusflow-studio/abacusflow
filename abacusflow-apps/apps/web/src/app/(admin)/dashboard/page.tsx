"use client";

import React, { useRef } from "react";
import { Button } from "antd";
import {
  AlertOutlined,
  PlusOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useMouseGlow } from "../../../hooks/use-mouse-glow";

export default function DashboardPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  useMouseGlow(heroRef);

  return (
    <div className="af-dashboard">
      <section
        ref={heroRef}
        className="af-dashboard-hero af-gradient-border af-mouse-glow"
      >
        <div className="af-hero-copy">
          <div className="af-kicker">库存脉冲 / 实时概览</div>
          <h1 className="af-dashboard-title af-gradient-text">
            业务流转一屏点亮
          </h1>
          <p className="af-dashboard-copy">
            产品、库存、采购、销售和伙伴网络在同一张脉冲图里联动。
            异常库存会被推到最前面，日常操作保持高密度但可扫读。
          </p>
        </div>
      </section>

      <div className="af-command-card af-bento-wide">
        <div className="af-section-head">
          <div>
            <h2>快捷作战台</h2>
            <p>高频入口靠前，采购、销售、库存风险可以直接切入处理。</p>
          </div>
        </div>
        <div className="af-command-actions">
          <Button
            type="primary"
            href="/transaction/purchase-order"
            icon={<PlusOutlined />}
            className="af-command-button"
          >
            采购入库
          </Button>
          <Button
            href="/transaction/sale-order"
            icon={<SwapOutlined />}
            className="af-command-button"
          >
            销售出库
          </Button>
          <Button
            href="/inventory"
            icon={<AlertOutlined />}
            className="af-command-button"
          >
            查看低库存
          </Button>
        </div>
      </div>
    </div>
  );
}
