import { productApi } from "@abacusflow/core";

/** 获取产品详情 */
export async function getProduct(id: number) {
  return productApi.getProduct({ id });
}

/** 更新产品 */
export async function updateProduct(
  id: number,
  input: {
    name: string;
    barcode: string;
    type: string;
    unit: string;
    specification?: string;
    categoryName?: string;
  },
) {
  await productApi.updateProduct({ id, updateProductInput: input as any });
}

/** 删除产品 */
export async function deleteProduct(id: number) {
  await productApi.deleteProduct({ id });
}

/** 创建产品 */
export async function createProduct(input: {
  name: string;
  barcode: string;
  type: string;
  unit: string;
  specification?: string;
  categoryName?: string;
}) {
  await productApi.addProduct({ createProductInput: input as any });
}
