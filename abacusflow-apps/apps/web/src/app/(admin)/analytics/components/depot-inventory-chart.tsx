"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import { PIE_PALETTE } from "./shared";

type Row = {
  "depot.name": string;
  "inventory_unit.quantity": string;
};

const QUERY = {
  dimensions: ["depot.name"],
  measures: ["inventory_unit.quantity"],
  order: { "inventory_unit.quantity": "desc" as const },
};

export function DepotInventoryChart() {
  const { data, loading, error } = useCubeQuery<Row>(QUERY);

  const option = useMemo((): EChartsOption => {
    const names = data.map((r) => r["depot.name"] ?? "未知");
    const quantities = data.map((r) => Number(r["inventory_unit.quantity"]));
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 16, right: 16, bottom: 24, left: 8, containLabel: true },
      xAxis: {
        type: "category",
        data: names,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "库存量",
        axisLabel: { fontSize: 11 },
        nameTextStyle: { fontSize: 11 },
        minInterval: 1,
      },
      series: [
        {
          type: "bar",
          data: quantities.map((v, i) => ({
            value: v,
            itemStyle: {
              color: PIE_PALETTE[i % PIE_PALETTE.length],
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barMaxWidth: 60,
          label: { show: true, position: "top", fontSize: 11 },
        },
      ],
    };
  }, [data]);

  return (
    <ChartCard title="仓库库存分布" loading={loading} error={error}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
