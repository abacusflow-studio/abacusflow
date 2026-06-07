"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import { COLORS, fmtMonth } from "./shared";

type OrderTrendRow = {
  "purchase_order.order_date.month": string;
  "purchase_order.count": string;
  "sale_order.count": string;
};

const QUERY = {
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

export function OrderTrendChart() {
  const { data, loading, error } = useCubeQuery<OrderTrendRow>(QUERY);

  const option = useMemo((): EChartsOption => {
    const months = data.map((r) => fmtMonth(r["purchase_order.order_date.month"]));
    const purchases = data.map((r) => Number(r["purchase_order.count"]));
    const sales = data.map((r) => Number(r["sale_order.count"]));
    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["采购单", "销售单"], top: 0 },
      grid: { top: 36, right: 16, bottom: 24, left: 48, containLabel: false },
      xAxis: { type: "category", data: months, axisLabel: { fontSize: 11 } },
      yAxis: { type: "value", axisLabel: { fontSize: 11 }, minInterval: 1 },
      series: [
        {
          name: "采购单",
          type: "line",
          data: purchases,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: COLORS.purchase },
          lineStyle: { width: 2 },
        },
        {
          name: "销售单",
          type: "line",
          data: sales,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: COLORS.sale },
          lineStyle: { width: 2 },
        },
      ],
    };
  }, [data]);

  return (
    <ChartCard title="月度订单趋势" loading={loading} error={error}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
