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

export function OrderTrendChart() {
  const [granularity, setGranularity] = useState<GranularityValue>("month");

  const purchaseQuery = useMemo(
    () => ({
      measures: ["purchase_order.count"],
      timeDimensions: [
        {
          dimension: "purchase_order.order_date",
          granularity,
          dateRange: GRANULARITY_DATE_RANGE[granularity],
        },
      ],
      order: { "purchase_order.order_date": "asc" as const },
    }),
    [granularity],
  );

  const saleQuery = useMemo(
    () => ({
      measures: ["sale_order.count"],
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

  const { data: purchaseData, loading: l1, error: e1 } = useCubeQuery(purchaseQuery);
  const { data: saleData, loading: l2, error: e2 } = useCubeQuery(saleQuery);

  const loading = l1 || l2;
  const error = e1 ?? e2;

  const option = useMemo((): EChartsOption => {
    const purchaseKey = `purchase_order.order_date.${granularity}`;
    const saleKey = `sale_order.order_date.${granularity}`;

    const purchaseMap = new Map(
      purchaseData.map((r) => [
        fmtDate(String(r[purchaseKey] ?? ""), granularity),
        Number(r["purchase_order.count"]),
      ]),
    );
    const saleMap = new Map(
      saleData.map((r) => [
        fmtDate(String(r[saleKey] ?? ""), granularity),
        Number(r["sale_order.count"]),
      ]),
    );

    const dates = [...new Set([...purchaseMap.keys(), ...saleMap.keys()])].sort();

    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["采购单", "销售单"], top: 0 },
      grid: { top: 36, right: 16, bottom: 24, left: 48, containLabel: false },
      xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
      yAxis: { type: "value", axisLabel: { fontSize: 11 }, minInterval: 1 },
      series: [
        {
          name: "采购单",
          type: "line",
          data: dates.map((d) => purchaseMap.get(d) ?? 0),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: COLORS.purchase },
          lineStyle: { width: 2 },
        },
        {
          name: "销售单",
          type: "line",
          data: dates.map((d) => saleMap.get(d) ?? 0),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: COLORS.sale },
          lineStyle: { width: 2 },
        },
      ],
    };
  }, [purchaseData, saleData, granularity]);

  return (
    <ChartCard
      title="订单趋势"
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
