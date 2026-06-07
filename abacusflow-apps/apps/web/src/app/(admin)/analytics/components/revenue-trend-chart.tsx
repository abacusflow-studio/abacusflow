"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import { COLORS, fmtMonth } from "./shared";

type RevenueRow = {
  "sale_order.order_date.month": string;
  "sale_order_item.revenue": string;
  "sale_order_item.profit": string;
};

const QUERY = {
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

export function RevenueTrendChart() {
  const { data, loading, error } = useCubeQuery<RevenueRow>(QUERY);

  const option = useMemo((): EChartsOption => {
    const months = data.map((r) => fmtMonth(r["sale_order.order_date.month"]));
    const revenues = data.map((r) => Number(r["sale_order_item.revenue"]));
    const profits = data.map((r) => Number(r["sale_order_item.profit"]));
    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["收入", "利润"], top: 0 },
      grid: { top: 36, right: 16, bottom: 24, left: 56, containLabel: false },
      xAxis: { type: "category", data: months, axisLabel: { fontSize: 11 } },
      yAxis: { type: "value", axisLabel: { fontSize: 11 } },
      series: [
        {
          name: "收入",
          type: "line",
          data: revenues,
          smooth: true,
          areaStyle: { opacity: 0.2, color: COLORS.revenue },
          itemStyle: { color: COLORS.revenue },
          lineStyle: { width: 2 },
        },
        {
          name: "利润",
          type: "line",
          data: profits,
          smooth: true,
          areaStyle: { opacity: 0.2, color: COLORS.profit },
          itemStyle: { color: COLORS.profit },
          lineStyle: { width: 2 },
        },
      ],
    };
  }, [data]);

  return (
    <ChartCard title="月度销售收入与利润" loading={loading} error={error}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
