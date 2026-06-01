/** 订单类型 */
export type OrderType = "purchase" | "sale";

/** 统一的订单记录（合并采购+销售） */
export interface OrderRecord {
  id: string;
  type: OrderType;
  orderNo: string;
  partyName: string;
  status: string;
  totalAmount: number;
  totalQuantity: number;
  itemCount: number;
  orderDate: string;
  createdAt: number;
}

/** 订单状态配置 */
export interface StatusConfig {
  label: string;
  bg: string;
  color: string;
}

/** 订单类型配置 */
export interface TypeConfig {
  label: string;
  color: string;
  bg: string;
}
