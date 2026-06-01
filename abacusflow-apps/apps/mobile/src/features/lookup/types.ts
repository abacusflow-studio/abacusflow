import type {
  BasicProduct,
  BasicInventory,
  BasicPurchaseOrder,
  BasicSaleOrder,
} from "@abacusflow/core";

/** 查询模式 */
export type LookupMode = "menu" | "product" | "inventory" | "order";

/** 订单状态配置 */
export interface OrderStatusConfig {
  label: string;
  bg: string;
  color: string;
}

/** 订单类型标签 */
export interface OrderTypeTag {
  _type: "purchase" | "sale";
}

/** 合并后的采购订单（带类型标记） */
export type TaggedPurchaseOrder = BasicPurchaseOrder & OrderTypeTag;

/** 合并后的销售订单（带类型标记） */
export type TaggedSaleOrder = BasicSaleOrder & OrderTypeTag;

/** 合并后的订单项 */
export type TaggedOrder = TaggedPurchaseOrder | TaggedSaleOrder;

/** 查询结果集 */
export interface LookupResults {
  products: BasicProduct[];
  inventories: BasicInventory[];
  purchaseOrders: BasicPurchaseOrder[];
  saleOrders: BasicSaleOrder[];
}
