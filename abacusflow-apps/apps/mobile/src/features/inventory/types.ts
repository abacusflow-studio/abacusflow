/** 库存健康状态 */
export interface InventoryHealthStatus {
  text: string;
  color: string;
}

/** 预警线表单数据 */
export interface WarningLineFormData {
  safetyStock: string;
  maxStock: string;
}
