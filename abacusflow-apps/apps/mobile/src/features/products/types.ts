import type { BasicProduct } from "@abacusflow/core";

/** 产品详情（直接使用 core 类型） */
export type ProductDetail = BasicProduct;

/** 产品表单数据 */
export interface ProductFormData {
  name: string;
  barcode: string;
  type: string;
  unit: string;
  specification?: string;
  categoryName?: string;
}
