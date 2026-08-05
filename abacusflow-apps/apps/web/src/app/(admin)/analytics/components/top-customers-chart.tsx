"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import { COLORS } from "./shared";

type Row = {
  "customer.name": string;
  "sale_order_item.revenue": string;
};

const QUERY = {
  dimensions: ["customer.name"],
  measures: ["sale_order_item.revenue"],
  order: { "sale_order_item.revenue": "desc" as const },
  limit: 10,
};

export function TopCustomersChart() {
  const { data, loading, error } = useCubeQuery<Row>(QUERY);

  const option = useMemo((): EChartsOption => {
    const rows = [...data].reverse();
    const names = rows.map((r) => r["customer.name"] ?? "未知");
    const revenues = rows.map((r) => Number(r["sale_order_item.revenue"]));
    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const p = (params as { name: string; value: number }[])[0];
          return `${p.name}<br/>销售额：${p.value.toLocaleString("zh-CN")} 元`;
        },
      },
      grid: { top: 8, right: 24, bottom: 8, left: 8, containLabel: true },
      xAxis: { type: "value", axisLabel: { fontSize: 11 } },
      yAxis: { type: "category", data: names, axisLabel: { fontSize: 11 } },
      series: [
        {
          type: "bar",
          data: revenues,
          barMaxWidth: 20,
          itemStyle: { color: COLORS.sale, borderRadius: [0, 4, 4, 0] },
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
    <ChartCard title="Top 10 客户销售额" loading={loading} error={error}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
