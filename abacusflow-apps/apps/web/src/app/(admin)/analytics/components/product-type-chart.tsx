"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import { PIE_PALETTE, PRODUCT_TYPE_LABELS } from "./shared";

type ProductTypeRow = {
  "product.type": string;
  "product.count": string;
};

const QUERY = {
  dimensions: ["product.type"],
  measures: ["product.count"],
  order: { "product.count": "desc" as const },
};

export function ProductTypeChart() {
  const { data, loading, error } = useCubeQuery<ProductTypeRow>(QUERY);

  const option = useMemo((): EChartsOption => {
    const types = data.map(
      (r) => PRODUCT_TYPE_LABELS[r["product.type"]] ?? r["product.type"],
    );
    const counts = data.map((r) => Number(r["product.count"]));
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { top: 16, right: 16, bottom: 24, left: 48, containLabel: false },
      xAxis: { type: "category", data: types, axisLabel: { fontSize: 12 } },
      yAxis: { type: "value", axisLabel: { fontSize: 11 }, minInterval: 1 },
      series: [
        {
          type: "bar",
          data: counts.map((v, i) => ({
            value: v,
            itemStyle: {
              color: PIE_PALETTE[i % PIE_PALETTE.length],
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barMaxWidth: 60,
        },
      ],
    };
  }, [data]);

  return (
    <ChartCard title="产品类型分布" loading={loading} error={error} height={260}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
