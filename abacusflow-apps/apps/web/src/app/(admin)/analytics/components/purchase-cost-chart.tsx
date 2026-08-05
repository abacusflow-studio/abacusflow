"use client";

import { useMemo, useState } from "react";
import { Segmented, Space } from "antd";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts-for-react/lib/types";
import { useCubeQuery } from "../../../../hooks/use-cube-query";
import { ChartCard } from "./chart-card";
import {
  COLORS,
  fmtDate,
  getDateRangeForGranularity,
  getTimeSeriesDataZoom,
  GRANULARITY_OPTIONS,
  MONTH_RANGE_OPTIONS,
  type GranularityValue,
  type MonthRangeValue,
} from "./shared";

export function PurchaseCostChart() {
  const [granularity, setGranularity] = useState<GranularityValue>("month");
  const [monthRange, setMonthRange] = useState<MonthRangeValue>("12");

  const query = useMemo(
    () => ({
      measures: ["purchase_order_item.cost", "purchase_order_item.quantity"],
      timeDimensions: [
        {
          dimension: "purchase_order.order_date",
          granularity,
          dateRange: getDateRangeForGranularity(granularity, monthRange),
        },
      ],
      order: { "purchase_order.order_date": "asc" as const },
    }),
    [granularity, monthRange],
  );

  const { data, loading, error } = useCubeQuery(query);

  const option = useMemo((): EChartsOption => {
    const dateKey = `purchase_order.order_date.${granularity}`;
    const dates = data.map((r) =>
      fmtDate(String(r[dateKey] ?? ""), granularity),
    );
    const costs = data.map((r) => Number(r["purchase_order_item.cost"]));
    const quantities = data.map((r) =>
      Number(r["purchase_order_item.quantity"]),
    );
    const dataZoom = getTimeSeriesDataZoom(dates.length);
    return {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      legend: { data: ["采购成本", "采购数量"], top: 0 },
      grid: {
        top: 36,
        right: 56,
        bottom: dataZoom ? 48 : 24,
        left: 56,
        containLabel: false,
      },
      xAxis: { type: "category", data: dates, axisLabel: { fontSize: 11 } },
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
      dataZoom,
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
  }, [data, granularity]);

  return (
    <ChartCard
      title="采购成本与数量"
      loading={loading}
      error={error}
      extra={
        <Space size={8} wrap>
          {granularity === "month" ? (
            <Segmented
              size="small"
              options={MONTH_RANGE_OPTIONS}
              value={monthRange}
              onChange={(v) => setMonthRange(v as MonthRangeValue)}
            />
          ) : null}
          <Segmented
            size="small"
            options={GRANULARITY_OPTIONS}
            value={granularity}
            onChange={(v) => setGranularity(v as GranularityValue)}
          />
        </Space>
      }
    >
      <ReactECharts option={option} style={{ height: "100%" }} />
    </ChartCard>
  );
}
