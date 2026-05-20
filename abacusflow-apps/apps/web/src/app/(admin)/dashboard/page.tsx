"use client";

import React from "react";
import { PageHeader } from "@abacusflow/ui";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="仪表盘" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 16,
        }}
      >
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>📈 销售趋势</h3>
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
            图表加载中...
          </div>
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>🔥 热销商品 Top 10</h3>
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
            图表加载中...
          </div>
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>📊 产品类别销售分布</h3>
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
            图表加载中...
          </div>
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>💰 产品价格追踪</h3>
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
            图表加载中...
          </div>
        </div>
        <div className="card">
          <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>👥 新客 vs 回头客</h3>
          <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "#999" }}>
            图表加载中...
          </div>
        </div>
      </div>
    </div>
  );
}
