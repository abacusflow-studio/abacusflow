"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import { PIE_PALETTE, STATUS_LABELS } from "./shared";

type InventoryStatusRow = {
  "inventory_unit.status": string;
  "inventory_unit.count": string;
};

const QUERY = {
  dimensions: ["inventory_unit.status"],
  measures: ["inventory_unit.count"],
  order: { "inventory_unit.count": "desc" as const },
};

export function InventoryStatusChart() {
  const { data, loading, error } = useCubeQuery<InventoryStatusRow>(QUERY);

  const option = useMemo((): EChartsOption => {
    const pieData = data.map((row, i) => ({
      name: STATUS_LABELS[row["inventory_unit.status"]] ?? row["inventory_unit.status"],
      value: Number(row["inventory_unit.count"]),
      itemStyle: { color: PIE_PALETTE[i % PIE_PALETTE.length] },
    }));
    return {
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      legend: { bottom: 0, type: "scroll", textStyle: { fontSize: 12 } },
      series: [
        {
          type: "pie",
          radius: ["38%", "62%"],
          center: ["50%", "48%"],
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
    <ChartCard title="库存单元状态分布" loading={loading} error={error}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
