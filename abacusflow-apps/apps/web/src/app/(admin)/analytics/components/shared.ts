export const COLORS = {
  purchase: "#38bdf8",
  sale: "#a78bfa",
  revenue: "#22c55e",
  profit: "#f59e0b",
};

export const PIE_PALETTE = [
  "#38bdf8",
  "#22c55e",
  "#a78bfa",
  "#f59e0b",
  "#fb7185",
  "#2dd4bf",
  "#eab308",
  "#94a3b8",
];

export const STATUS_LABELS: Record<string, string> = {
  NORMAL: "正常",
  CONSUMED: "已出库",
  CANCELED: "已取消",
  REVERSED: "已撤销",
};

// ─── Granularity ─────────────────────────────────────────────────────────────

export type GranularityValue = "day" | "week" | "month" | "quarter" | "year";
export type MonthRangeValue = "12" | "24" | "36" | "all";

export const GRANULARITY_OPTIONS: { label: string; value: GranularityValue }[] = [
  { label: "日", value: "day" },
  { label: "周", value: "week" },
  { label: "月", value: "month" },
  { label: "季", value: "quarter" },
  { label: "年", value: "year" },
];

export const GRANULARITY_DATE_RANGE: Record<GranularityValue, string> = {
  day: "Last 7 days",
  week: "Last 12 weeks",
  month: "Last 12 months",
  quarter: "Last 8 quarters",
  year: "Last 5 years",
};

export const MONTH_RANGE_OPTIONS: { label: string; value: MonthRangeValue }[] = [
  { label: "近12月", value: "12" },
  { label: "近24月", value: "24" },
  { label: "近36月", value: "36" },
  { label: "全部", value: "all" },
];

export function getDateRangeForGranularity(
  granularity: GranularityValue,
  monthRange: MonthRangeValue,
): string | undefined {
  if (granularity !== "month") return GRANULARITY_DATE_RANGE[granularity];
  if (monthRange === "all") return undefined;
  return `Last ${monthRange} months`;
}

export function getTimeSeriesDataZoom(pointCount: number, visiblePoints = 12) {
  if (pointCount <= visiblePoints) return undefined;

  return [
    {
      type: "inside" as const,
      throttle: 50,
      start: Math.max(0, 100 - (visiblePoints / pointCount) * 100),
      end: 100,
    },
    {
      type: "slider" as const,
      height: 16,
      bottom: 4,
      brushSelect: false,
      showDetail: false,
    },
  ];
}

export function fmtDate(raw: string, granularity: GranularityValue): string {
  if (!raw) return "";
  const yy = raw.slice(2, 4);
  const yyyy = raw.slice(0, 4);
  const mm = raw.slice(5, 7);
  const dd = raw.slice(8, 10);

  switch (granularity) {
    case "day":
      return `${yy}/${mm}/${dd}`;
    case "week": {
      const date = new Date(raw);
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const week = Math.ceil(
        ((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
      );
      return `${yy}/W${String(week).padStart(2, "0")}`;
    }
    case "month":
      return `${yy}/${mm}`;
    case "quarter":
      return `${yy}/Q${Math.ceil(Number(mm) / 3)}`;
    case "year":
      return yyyy;
  }
}
