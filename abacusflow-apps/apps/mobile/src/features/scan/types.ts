import type { SelectableProduct } from "@abacusflow/core";

/** 扫码模式 */
export type ScanMode = "purchase" | "sale" | "lookup";

/** 扫码结果 */
export interface ScanResult {
  barcode: string;
  product: SelectableProduct | null;
}
