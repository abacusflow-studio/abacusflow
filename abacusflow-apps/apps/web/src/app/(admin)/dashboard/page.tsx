"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Spin } from "antd";
import {
  AlertOutlined,
  BankOutlined,
  HomeOutlined,
  InboxOutlined,
  PlusOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SwapOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  depotApi,
  inventoryApi,
  partnerApi,
  productApi,
  transactionApi,
} from "@abacusflow/core";

interface DashboardStats {
  productCount: number;
  inventoryCount: number;
  purchaseOrderCount: number;
  saleOrderCount: number;
  customerCount: number;
  supplierCount: number;
  depotCount: number;
  lowStockCount: number;
}

const numberFormatter = new Intl.NumberFormat("zh-CN");

const EMPTY_STATS: DashboardStats = {
  productCount: 0,
  inventoryCount: 0,
  purchaseOrderCount: 0,
  saleOrderCount: 0,
  customerCount: 0,
  supplierCount: 0,
  depotCount: 0,
  lowStockCount: 0,
};

const STAT_CARDS = [
  {
    key: "productCount" as const,
    label: "产品总数",
    code: "产品",
    hint: "产品目录覆盖",
    icon: <ShoppingOutlined />,
    accent: "#38bdf8",
  },
  {
    key: "inventoryCount" as const,
    label: "库存记录",
    code: "库存",
    hint: "库存单元追踪",
    icon: <InboxOutlined />,
    accent: "#22c55e",
  },
  {
    key: "purchaseOrderCount" as const,
    label: "采购单",
    code: "采购",
    hint: "补货链路累计",
    icon: <ShoppingCartOutlined />,
    accent: "#f59e0b",
  },
  {
    key: "saleOrderCount" as const,
    label: "销售单",
    code: "销售",
    hint: "出库链路累计",
    icon: <ShopOutlined />,
    accent: "#a78bfa",
  },
  {
    key: "customerCount" as const,
    label: "客户数",
    code: "客户",
    hint: "需求侧网络",
    icon: <UserOutlined />,
    accent: "#2dd4bf",
  },
  {
    key: "supplierCount" as const,
    label: "供应商",
    code: "供应",
    hint: "供应侧网络",
    icon: <BankOutlined />,
    accent: "#fb7185",
  },
  {
    key: "depotCount" as const,
    label: "储存点",
    code: "仓点",
    hint: "仓点容量入口",
    icon: <HomeOutlined />,
    accent: "#eab308",
  },
  {
    key: "lowStockCount" as const,
    label: "低库存预警",
    code: "预警",
    hint: "安全库存偏离",
    icon: <WarningOutlined />,
    accent: "#f43f5e",
  },
];

const formatNumber = (value: number) => numberFormatter.format(value);

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [failedMetrics, setFailedMetrics] = useState<string[]>([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const failed: string[] = [];

    const [
      productsResult,
      inventoriesResult,
      purchaseOrdersResult,
      saleOrdersResult,
      customersResult,
      suppliersResult,
      depotsResult,
    ] = await Promise.allSettled([
      productApi.listBasicProductsPage({ pageIndex: 1, pageSize: 1 }),
      inventoryApi.listBasicInventoriesPage({ pageIndex: 1, pageSize: 100 }),
      transactionApi.listBasicPurchaseOrdersPage({
        pageIndex: 1,
        pageSize: 1,
      }),
      transactionApi.listBasicSaleOrdersPage({ pageIndex: 1, pageSize: 1 }),
      partnerApi.listBasicCustomersPage({ pageIndex: 1, pageSize: 1 }),
      partnerApi.listBasicSuppliersPage({ pageIndex: 1, pageSize: 1 }),
      depotApi.listBasicDepots(),
    ]);

    const readNumber = <T,>(
      label: string,
      result: PromiseSettledResult<T>,
      select: (value: T) => number,
    ) => {
      if (result.status === "fulfilled") return select(result.value);
      failed.push(label);
      console.error(`[dashboard] ${label}读取失败`, result.reason);
      return 0;
    };

    const inventoryCount = readNumber(
      "库存记录",
      inventoriesResult,
      (value) => value.totalElements,
    );

    let lowStockCount = 0;
    if (inventoriesResult.status === "fulfilled") {
      lowStockCount = inventoriesResult.value.content.filter(
        (item) =>
          item.safetyStock !== undefined && item.quantity < item.safetyStock,
      ).length;
    }

    setStats({
      productCount: readNumber(
        "产品总数",
        productsResult,
        (value) => value.totalElements,
      ),
      inventoryCount,
      purchaseOrderCount: readNumber(
        "采购单",
        purchaseOrdersResult,
        (value) => value.totalElements,
      ),
      saleOrderCount: readNumber(
        "销售单",
        saleOrdersResult,
        (value) => value.totalElements,
      ),
      customerCount: readNumber(
        "客户数",
        customersResult,
        (value) => value.totalElements,
      ),
      supplierCount: readNumber(
        "供应商",
        suppliersResult,
        (value) => value.totalElements,
      ),
      depotCount: readNumber("储存点", depotsResult, (value) => value.length),
      lowStockCount,
    });
    setFailedMetrics(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const liveStats = stats;

  const derived = useMemo(() => {
    const transactionCount =
      liveStats.purchaseOrderCount + liveStats.saleOrderCount;
    const partnerCount = liveStats.customerCount + liveStats.supplierCount;
    const riskPercent = liveStats.inventoryCount
      ? clampPercent(
          Math.round((liveStats.lowStockCount / liveStats.inventoryCount) * 100),
        )
      : 0;
    const inventoryHealth = clampPercent(100 - riskPercent);
    const networkLoad = clampPercent(
      Math.round((partnerCount / Math.max(partnerCount + liveStats.depotCount, 1)) * 100),
    );
    const transactionBalance = transactionCount
      ? clampPercent(
          Math.round((liveStats.saleOrderCount / transactionCount) * 100),
        )
      : 0;

    return {
      transactionCount,
      partnerCount,
      riskPercent,
      inventoryHealth,
      networkLoad,
      transactionBalance,
    };
  }, [liveStats]);

  const workflowRows = [
    {
      label: "库存健康",
      value: derived.inventoryHealth,
      color: "#22c55e",
    },
    {
      label: "交易出库",
      value: derived.transactionBalance,
      color: "#38bdf8",
    },
    {
      label: "伙伴网络",
      value: derived.networkLoad,
      color: "#f59e0b",
    },
  ];

  return (
    <div className="af-dashboard">
      <section className="af-dashboard-hero">
        <div className="af-hero-copy">
          <div className="af-kicker">库存脉冲 / 实时概览</div>
          <h1 className="af-dashboard-title">业务流转一屏点亮</h1>
          <p className="af-dashboard-copy">
            产品、库存、采购、销售和伙伴网络在同一张脉冲图里联动。
            异常库存会被推到最前面，日常操作保持高密度但可扫读。
          </p>
          <div className="af-hero-metrics">
            <div className="af-hero-chip">
              <span>交易信号</span>
              <strong>{formatNumber(derived.transactionCount)}</strong>
            </div>
            <div className="af-hero-chip">
              <span>伙伴节点</span>
              <strong>{formatNumber(derived.partnerCount)}</strong>
            </div>
            <div className="af-hero-chip">
              <span>库存健康</span>
              <strong>{derived.inventoryHealth}%</strong>
            </div>
          </div>
        </div>

        <div className="af-flow-console" aria-hidden="true">
          <div className="af-console-head">
            <span>流转控制台</span>
            <span className="af-console-lights">
              <span />
              <span />
              <span />
            </span>
          </div>
          <div className="af-console-body">
            <div
              className="af-console-route"
              style={{ "--route-color": "#22c55e" } as React.CSSProperties}
            >
              <span>采购入库</span>
              <div className="af-route-line" />
              <span>{formatNumber(liveStats.purchaseOrderCount)}</span>
            </div>
            <div
              className="af-console-route"
              style={{ "--route-color": "#38bdf8" } as React.CSSProperties}
            >
              <span>库存同步</span>
              <div className="af-route-line" />
              <span>{formatNumber(liveStats.inventoryCount)}</span>
            </div>
            <div
              className="af-console-route"
              style={{ "--route-color": "#f59e0b" } as React.CSSProperties}
            >
              <span>销售出库</span>
              <div className="af-route-line" />
              <span>{formatNumber(liveStats.saleOrderCount)}</span>
            </div>
            <div
              className="af-console-route"
              style={{ "--route-color": "#fb7185" } as React.CSSProperties}
            >
              <span>风险预警</span>
              <div className="af-route-line" />
              <span>{formatNumber(liveStats.lowStockCount)}</span>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="af-dashboard-loading">
          <Spin size="large" />
          <span>正在同步业务数据...</span>
        </div>
      ) : (
        <>
          {failedMetrics.length > 0 && (
            <div className="af-dashboard-warning">
              部分统计暂时无法读取：{failedMetrics.join("、")}。当前页面已显示其它可用数据。
            </div>
          )}

          <section className="af-stat-grid" aria-label="业务统计">
            {STAT_CARDS.map((card, index) => (
              <article
                className="af-stat-card"
                key={card.key}
                style={
                  {
                    "--card-accent": card.accent,
                    animationDelay: `${index * 55}ms`,
                  } as React.CSSProperties
                }
              >
                <div className="af-stat-top">
                  <span className="af-stat-icon">{card.icon}</span>
                  <span className="af-stat-code">{card.code}</span>
                </div>
                <p className="af-stat-label">{card.label}</p>
                <div className="af-stat-value">{formatNumber(stats[card.key])}</div>
                <div className="af-stat-footer">
                  <span>{card.hint}</span>
                  <span className="af-stat-spark" />
                </div>
              </article>
            ))}
          </section>

          <section className="af-dashboard-lower">
            <div className="af-command-card">
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
                  danger={stats.lowStockCount > 0}
                  className="af-command-button"
                >
                  查看低库存
                </Button>
              </div>

              <div className="af-workflow-list">
                {workflowRows.map((row) => (
                  <div className="af-workflow-row" key={row.label}>
                    <span>{row.label}</span>
                    <div className="af-workflow-meter">
                      <span
                        style={
                          {
                            "--workflow-value": `${row.value}%`,
                            "--workflow-color": row.color,
                          } as React.CSSProperties
                        }
                      />
                    </div>
                    <strong>{row.value}%</strong>
                  </div>
                ))}
              </div>
            </div>

            <aside className="af-risk-card">
              <div className="af-section-head">
                <div>
                  <h2>低库存雷达</h2>
                  <p>安全库存以下的产品会形成优先处理信号。</p>
                </div>
              </div>
              <div className="af-risk-number">{formatNumber(stats.lowStockCount)}</div>
              <div className="af-risk-label">
                {stats.lowStockCount > 0 ? "需要补货关注" : "库存状态平稳"}
              </div>
              <p className="af-risk-copy">
                {stats.lowStockCount > 0
                  ? "建议先检查低库存产品的采购链路和仓点容量，避免销售侧被动等待。"
                  : "当前没有低于安全库存的记录，库存健康度维持在高位。"}
              </p>
              <div
                className="af-risk-meter"
                style={
                  {
                    "--risk-value": `${Math.max(4, derived.riskPercent)}%`,
                  } as React.CSSProperties
                }
              >
                <span />
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
