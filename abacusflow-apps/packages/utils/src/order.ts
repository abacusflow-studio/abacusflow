export type OrderStatus = "pending" | "completed" | "canceled" | "reversed";

const STATUS_MAP: Record<OrderStatus, string> = {
  pending: "进行中",
  completed: "已完成",
  canceled: "已取消",
  reversed: "已撤回",
};

export function translateOrderStatus(input?: OrderStatus): string {
  if (!input) return "";
  return STATUS_MAP[input] || input;
}
