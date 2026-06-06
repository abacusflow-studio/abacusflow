"use client";

import React, { useMemo } from "react";
import { Card, Spin, Typography } from "antd";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AdminPageHeader } from "../../../components/admin-page-header";
import { useCubeQuery } from "../../../hooks/use-cube-query";

const { Text } = Typography;

// ─── colour tokens ──────────────────────────────────────────────────────────

const COLORS = {
  purchase: "#38bdf8",
  sale: "#a78bfa",
  revenue: "#22c55e",
  profit: "#f59e0b",
};

const PIE_PALETTE = [
  "#38bdf8",
  "#22c55e",
  "#a78bfa",
  "#f59e0b",
  "#fb7185",
  "#2dd4bf",
  "#eab308",
  "#94a3b8",
];

const STATUS_LABELS: Record<string, string> = {
  available: "可用",
  frozen: "冻结",
  sold: "已售",
  returned: "已退",
  damaged: "损坏",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  asset: "资产",
  consumable: "耗材",
  service: "服务",
};

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(month: string): string {
  // "2025-03-01T00:00:00.000" → "25/03"
  return month ? month.slice(2, 7).replace("-", "/") : "";
}

function ChartCard({
  title,
  loading,
  error,
  height = 260,
  children,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <Card
      title={<span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>}
      size="small"
      style={{ flex: 1, minWidth: 0 }}
    >
      {loading ? (
        <div
          style={{
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin />
        </div>
      ) : error ? (
        <div
          style={{
            height,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            {error}
          </Text>
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </Card>
  );
}

// ─── Order trend chart ───────────────────────────────────────────────────────

const ORDER_TREND_QUERY = {
  measures: ["purchase_order.count", "sale_order.count"],
  timeDimensions: [
    {
      dimension: "purchase_order.order_date",
      granularity: "month" as const,
      dateRange: "Last 12 months",
    },
  ],
  order: { "purchase_order.order_date": "asc" as const },
};

type OrderTrendRow = {
  "purchase_order.order_date.month": string;
  "purchase_order.count": string;
  "sale_order.count": string;
};

function OrderTrendChart() {
  const { data, loading, error } = useCubeQuery<OrderTrendRow>(ORDER_TREND_QUERY);

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        month: fmt(row["purchase_order.order_date.month"]),
        采购单: Number(row["purchase_order.count"]),
        销售单: Number(row["sale_order.count"]),
      })),
    [data],
  );

  return (
    <ChartCard title="月度订单趋势" loading={loading} error={error}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="采购单"
            stroke={COLORS.purchase}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="销售单"
            stroke={COLORS.sale}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Revenue trend chart ─────────────────────────────────────────────────────

const REVENUE_QUERY = {
  measures: ["sale_order_item.revenue", "sale_order_item.profit"],
  timeDimensions: [
    {
      dimension: "sale_order.order_date",
      granularity: "month" as const,
      dateRange: "Last 12 months",
    },
  ],
  order: { "sale_order.order_date": "asc" as const },
};

type RevenueRow = {
  "sale_order.order_date.month": string;
  "sale_order_item.revenue": string;
  "sale_order_item.profit": string;
};

function RevenueTrendChart() {
  const { data, loading, error } = useCubeQuery<RevenueRow>(REVENUE_QUERY);

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        month: fmt(row["sale_order.order_date.month"]),
        收入: Number(row["sale_order_item.revenue"]),
        利润: Number(row["sale_order_item.profit"]),
      })),
    [data],
  );

  return (
    <ChartCard title="月度销售收入与利润" loading={loading} error={error}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.revenue} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.profit} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.profit} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="收入"
            stroke={COLORS.revenue}
            strokeWidth={2}
            fill="url(#revGrad)"
          />
          <Area
            type="monotone"
            dataKey="利润"
            stroke={COLORS.profit}
            strokeWidth={2}
            fill="url(#profitGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Inventory unit status pie ────────────────────────────────────────────────

const INVENTORY_STATUS_QUERY = {
  dimensions: ["inventory_unit.status"],
  measures: ["inventory_unit.count"],
  order: { "inventory_unit.count": "desc" as const },
};

type InventoryStatusRow = {
  "inventory_unit.status": string;
  "inventory_unit.count": string;
};

function InventoryStatusChart() {
  const { data, loading, error } = useCubeQuery<InventoryStatusRow>(INVENTORY_STATUS_QUERY);

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        name: STATUS_LABELS[row["inventory_unit.status"]] ?? row["inventory_unit.status"],
        value: Number(row["inventory_unit.count"]),
      })),
    [data],
  );

  return (
    <ChartCard title="库存单元状态分布" loading={loading} error={error}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="65%"
            paddingAngle={3}
            label={({ name, percent }) =>
              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => Number(v).toLocaleString("zh-CN")} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Product type bar chart ───────────────────────────────────────────────────

const PRODUCT_TYPE_QUERY = {
  dimensions: ["product.type"],
  measures: ["product.count"],
  order: { "product.count": "desc" as const },
};

type ProductTypeRow = {
  "product.type": string;
  "product.count": string;
};

function ProductTypeChart() {
  const { data, loading, error } = useCubeQuery<ProductTypeRow>(PRODUCT_TYPE_QUERY);

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        type: PRODUCT_TYPE_LABELS[row["product.type"]] ?? row["product.type"],
        数量: Number(row["product.count"]),
      })),
    [data],
  );

  return (
    <ChartCard title="产品类型分布" loading={loading} error={error} height={260}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
          <XAxis dataKey="type" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="数量" radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Purchase cost trend ──────────────────────────────────────────────────────

const COST_QUERY = {
  measures: ["purchase_order_item.cost", "purchase_order_item.quantity"],
  timeDimensions: [
    {
      dimension: "purchase_order.order_date",
      granularity: "month" as const,
      dateRange: "Last 12 months",
    },
  ],
  order: { "purchase_order.order_date": "asc" as const },
};

type CostRow = {
  "purchase_order.order_date.month": string;
  "purchase_order_item.cost": string;
  "purchase_order_item.quantity": string;
};

function PurchaseCostChart() {
  const { data, loading, error } = useCubeQuery<CostRow>(COST_QUERY);

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        month: fmt(row["purchase_order.order_date.month"]),
        采购成本: Number(row["purchase_order_item.cost"]),
        采购数量: Number(row["purchase_order_item.quantity"]),
      })),
    [data],
  );

  return (
    <ChartCard title="月度采购成本与数量" loading={loading} error={error}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="left"
            dataKey="采购成本"
            fill={COLORS.purchase}
            radius={[3, 3, 0, 0]}
            opacity={0.85}
          />
          <Bar
            yAxisId="right"
            dataKey="采购数量"
            fill={COLORS.sale}
            radius={[3, 3, 0, 0]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="数据刻画 / 业务洞察"
        title="数据刻画"
        description="基于 Cube.js 聚合的业务指标趋势图，帮助洞察采购、销售、库存的运营规律。"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Row 1: order trend + revenue trend */}
        <div style={{ display: "flex", gap: 16 }}>
          <OrderTrendChart />
          <RevenueTrendChart />
        </div>

        {/* Row 2: purchase cost + inventory status */}
        <div style={{ display: "flex", gap: 16 }}>
          <PurchaseCostChart />
          <InventoryStatusChart />
        </div>

        {/* Row 3: product type (narrower, not full width) */}
        <div style={{ display: "flex", gap: 16 }}>
          <ProductTypeChart />
          <div style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
}
