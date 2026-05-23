export type InventoryUnitType = "instance" | "batch";
export type InventoryUnitStatus = "normal" | "consumed" | "canceled" | "reversed";

const UNIT_TYPE_MAP: Record<InventoryUnitType, string> = {
  instance: "资产单元",
  batch: "批次单元",
};

const UNIT_STATUS_MAP: Record<InventoryUnitStatus, string> = {
  normal: "正常",
  consumed: "已出库",
  canceled: "已取消",
  reversed: "已撤回",
};

export function translateInventoryUnitType(input?: string): string {
  if (!input) return "";
  return UNIT_TYPE_MAP[input as InventoryUnitType] || input;
}

export function translateInventoryUnitStatus(input?: string): string {
  if (!input) return "";
  return UNIT_STATUS_MAP[input as InventoryUnitStatus] || input;
}
