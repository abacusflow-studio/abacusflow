"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import { COLORS } from "./shared";

type Row = {
  "supplier.name": string;
  "purchase_order_item.cost": string;
};

const QUERY = {
  dimensions: ["supplier.name"],
  measures: ["purchase_order_item.cost"],
  order: { "purchase_order_item.cost": "desc" as const },
  limit: 10,
};

export function TopSuppliersChart() {
  const { data, loading, error } = useCubeQuery<Row>(QUERY);

  const option = useMemo((): EChartsOption => {
    const rows = [...data].reverse();
    const names = rows.map((r) => r["supplier.name"] ?? "未知");
    const costs = rows.map((r) => Number(r["purchase_order_item.cost"]));
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const p = (params as { name: string; value: number }[])[0];
          return `${p.name}<br/>采购额：${p.value.toLocaleString("zh-CN")} 元`;
        },
      },
      grid: { top: 8, right: 24, bottom: 8, left: 8, containLabel: true },
      xAxis: { type: "value", axisLabel: { fontSize: 11 } },
      yAxis: { type: "category", data: names, axisLabel: { fontSize: 11 } },
      series: [
        {
          type: "bar",
          data: costs,
          barMaxWidth: 20,
          itemStyle: { color: COLORS.purchase, borderRadius: [0, 4, 4, 0] },
          label: {
            show: true,
            position: "right",
            fontSize: 11,
            formatter: "{c}",
          },
        },
      ],
    };
  }, [data]);

  return (
    <ChartCard title="Top 10 供应商采购额" loading={loading} error={error}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
