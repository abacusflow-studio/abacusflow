import { productApi, type SelectableProduct } from "@abacusflow/core";

/** 通过条码查找可选产品 */
export async function findProductByBarcode(
  barcode: string,
): Promise<SelectableProduct | null> {
  const products = await productApi.listSelectableProducts();
  return products.find((p) => p.barcode === barcode) || null;
}
