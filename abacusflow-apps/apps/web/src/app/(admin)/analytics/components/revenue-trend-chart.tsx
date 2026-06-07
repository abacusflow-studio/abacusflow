"use client";

import { useMemo, useState } from "react";
import { Segmented } from "antd";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import {
  COLORS,
  fmtDate,
  GRANULARITY_DATE_RANGE,
  GRANULARITY_OPTIONS,
  type GranularityValue,
} from "./shared";

export function RevenueTrendChart() {
  const [granularity, setGranularity] = useState<GranularityValue>("month");

  const query = useMemo(
    () => ({
      measures: ["sale_order_item.revenue", "sale_order_item.profit"],
      timeDimensions: [
        {
          dimension: "sale_order.order_date",
          granularity,
          dateRange: GRANULARITY_DATE_RANGE[granularity],
        },
      ],
      order: { "sale_order.order_date": "asc" as const },
    }),
    [granularity],
  );

  const { data, loading, error } = useCubeQuery(query);

  const option = useMemo((): EChartsOption => {
    const dateKey = `sale_order.order_date.${granularity}`;
    const dates = data.map((r) => fmtDate(String(r[dateKey] ?? ""), granularity));
    const revenues = data.map((r) => Number(r["sale_order_item.revenue"]));
    const profits = data.map((r) => Number(r["sale_order_item.profit"]));
    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["收入", "利润"], top: 0 },
      grid: { top: 36, right: 16, bottom: 24, left: 56, containLabel: false },
      xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
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
  }, [data, granularity]);

  return (
    <ChartCard
      title="销售收入与利润"
      loading={loading}
      error={error}
      extra={
        <Segmented
          size="small"
          options={GRANULARITY_OPTIONS}
          value={granularity}
          onChange={(v) => setGranularity(v as GranularityValue)}
        />
      }
    >
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
