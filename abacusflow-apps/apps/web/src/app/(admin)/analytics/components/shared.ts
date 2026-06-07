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
  available: "可用",
  frozen: "冻结",
  sold: "已售",
  returned: "已退",
  damaged: "损坏",
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  asset: "资产",
  consumable: "耗材",
  service: "服务",
};

export function fmtMonth(month: string): string {
  return month ? month.slice(2, 7).replace("-", "/") : "";
}
