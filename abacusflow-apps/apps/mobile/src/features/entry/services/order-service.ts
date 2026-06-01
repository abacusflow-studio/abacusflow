import { transactionApi } from "@abacusflow/core";
import type { PurchaseOrderItem, SaleOrderItem } from "../types";

/**
 * 创建采购入库单并立即完成
 * Mobile 端扫码 = 已到货，创建后直接完成入库
 */
export async function createPurchaseOrder(input: {
  supplierId: number;
  orderDate: string;
  items: PurchaseOrderItem[];
  note?: string;
}): Promise<void> {
  // 1. 创建采购单
  const order = await transactionApi.addPurchaseOrder({
    createPurchaseOrderInput: {
      supplierId: input.supplierId,
      orderDate: new Date(`${input.orderDate}T00:00:00`),
      note: input.note?.trim() || undefined,
      orderItems: input.items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        serialNumber: item.serialNumber || undefined,
      })),
    },
  });

  // 2. 立即完成入库
  await transactionApi.completePurchaseOrder({ id: order.id });
}

/** 创建销售出库单（不自动完成，需要后续手动完成） */
export async function createSaleOrder(input: {
  customerId: number;
  orderDate: string;
  items: SaleOrderItem[];
  discountFactor?: number;
  note?: string;
}): Promise<void> {
  await transactionApi.addSaleOrder({
    createSaleOrderInput: {
      customerId: input.customerId,
      orderDate: new Date(`${input.orderDate}T00:00:00`),
      note: input.note?.trim() || undefined,
      orderItems: input.items.map((item) => ({
        inventoryUnitId: item.inventoryUnitId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        discountFactor: input.discountFactor ?? 1,
      })),
    },
  });
}
