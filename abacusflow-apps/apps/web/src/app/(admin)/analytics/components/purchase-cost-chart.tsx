"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import { COLORS, fmtMonth } from "./shared";

type CostRow = {
  "purchase_order.order_date.month": string;
  "purchase_order_item.cost": string;
  "purchase_order_item.quantity": string;
};

const QUERY = {
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

export function PurchaseCostChart() {
  const { data, loading, error } = useCubeQuery<CostRow>(QUERY);

  const option = useMemo((): EChartsOption => {
    const months = data.map((r) => fmtMonth(r["purchase_order.order_date.month"]));
    const costs = data.map((r) => Number(r["purchase_order_item.cost"]));
    const quantities = data.map((r) => Number(r["purchase_order_item.quantity"]));
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { data: ["采购成本", "采购数量"], top: 0 },
      grid: { top: 36, right: 56, bottom: 24, left: 56, containLabel: false },
      xAxis: { type: "category", data: months, axisLabel: { fontSize: 11 } },
      yAxis: [
        {
          type: "value",
          name: "金额",
          axisLabel: { fontSize: 11 },
          nameTextStyle: { fontSize: 11 },
        },
        {
          type: "value",
          name: "数量",
          position: "right",
          axisLabel: { fontSize: 11 },
          nameTextStyle: { fontSize: 11 },
          minInterval: 1,
        },
      ],
      series: [
        {
          name: "采购成本",
          type: "bar",
          yAxisIndex: 0,
          data: costs,
          barMaxWidth: 30,
          itemStyle: { color: COLORS.purchase, borderRadius: [3, 3, 0, 0] },
          opacity: 0.85,
        },
        {
          name: "采购数量",
          type: "bar",
          yAxisIndex: 1,
          data: quantities,
          barMaxWidth: 30,
          itemStyle: { color: COLORS.sale, borderRadius: [3, 3, 0, 0] },
          opacity: 0.85,
        },
      ],
    };
  }, [data]);

  return (
    <ChartCard title="月度采购成本与数量" loading={loading} error={error}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
