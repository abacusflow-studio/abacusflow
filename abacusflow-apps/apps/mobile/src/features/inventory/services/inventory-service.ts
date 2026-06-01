import { inventoryApi, type BasicInventoryUnit } from "@abacusflow/core";
import type { BasicInventory } from "@abacusflow/core";

/** 根据 ID 获取库存详情 */
export async function getInventoryById(
  id: number,
): Promise<BasicInventory | null> {
  const page = await inventoryApi.listBasicInventoriesPage({
    pageIndex: 1,
    pageSize: 100,
  });
  return page.content.find((item) => item.id === id) ?? null;
}

/** 调整预警线 */
export async function adjustWarningLine(
  id: number,
  safetyStock: number,
  maxStock: number,
): Promise<void> {
  await inventoryApi.adjustWarningLine({
    id,
    adjustWarningLineRequest: { safetyStock, maxStock },
  });
}

/** 获取产品可售库存单元 */
export async function findSellableUnitsForProduct(product: {
  name: string;
  type: string;
}): Promise<BasicInventoryUnit[]> {
  const res = await inventoryApi.listBasicInventoriesPage({
    pageIndex: 1,
    pageSize: 100,
    productName: product.name,
    productType: product.type as any,
  });
  return res.content
    .filter(
      (inventory) =>
        inventory.productName === product.name &&
        inventory.productType === product.type,
    )
    .flatMap((inventory) => inventory.units)
    .filter(
      (unit) =>
        (unit.status === "normal" || unit.status === "reversed") &&
        unit.remainingQuantity > 0,
    );
}
