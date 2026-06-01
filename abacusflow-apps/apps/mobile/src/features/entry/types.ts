import type { SelectableProduct } from "@abacusflow/core";

/** 采购入库单行项目 */
export interface PurchaseOrderItem {
  productId: number;
  productName: string;
  barcode: string;
  quantity: string;
  unitPrice: string;
}

/** 销售出库单行项目 */
export interface SaleOrderItem {
  inventoryUnitId: number;
  title: string;
  quantity: string;
  unitPrice: string;
  remainingQuantity?: number;
}

/** 合作伙伴选项（供应商/客户） */
export interface PartnerOption {
  id: number;
  name: string;
}

/** 产品选项（可选产品列表项） */
export type ProductOption = SelectableProduct;

/** 采购入库表单数据（用于草稿持久化） */
export interface PurchaseFormData {
  supplierId?: number;
  orderDate: string;
  items: PurchaseOrderItem[];
  note?: string;
}

/** 销售出库表单数据（用于草稿持久化） */
export interface SaleFormData {
  customerId?: number;
  orderDate: string;
  items: SaleOrderItem[];
  discountFactor?: string;
  note?: string;
}

/** 产品建档表单数据 */
export interface ProductEntryFormData {
  name: string;
  barcode: string;
  type: string;
  unit: string;
  specification?: string;
  categoryName?: string;
}

/** 录入首页草稿统计 */
export interface DraftSummary {
  purchase: number;
  sale: number;
  product: number;
}
