"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import { PIE_PALETTE } from "./shared";

type Row = {
  "product_category.name": string;
  "purchase_order_item.cost": string;
};

const QUERY = {
  dimensions: ["product_category.name"],
  measures: ["purchase_order_item.cost"],
  order: { "purchase_order_item.cost": "desc" as const },
};

export function CategoryCostChart() {
  const { data, loading, error } = useCubeQuery<Row>(QUERY);

  const option = useMemo((): EChartsOption => {
    const pieData = data.map((r, i) => ({
      name: r["product_category.name"] ?? "未分类",
      value: Number(r["purchase_order_item.cost"]),
      itemStyle: { color: PIE_PALETTE[i % PIE_PALETTE.length] },
    }));
    return {
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} 元 ({d}%)",
      },
      legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 12 } },
      series: [
        {
          type: "pie",
          radius: ["38%", "62%"],
          center: ["50%", "46%"],
          padAngle: 3,
          data: pieData,
          label: { formatter: "{b}: {d}%", fontSize: 11 },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.3)" },
          },
        },
      ],
    };
  }, [data]);

  return (
    <ChartCard title="品类采购成本占比" loading={loading} error={error}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
