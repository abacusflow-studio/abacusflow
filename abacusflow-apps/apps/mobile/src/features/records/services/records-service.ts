import {
  transactionApi,
  type BasicPurchaseOrder,
  type BasicSaleOrder,
} from "@abacusflow/core";
import type { OrderRecord, OrderType } from "../types";

const PAGE_SIZE = 20;

/** 将采购订单转换为统一记录格式 */
function toPurchaseRecord(o: BasicPurchaseOrder): OrderRecord {
  return {
    id: `purchase-${o.id}`,
    type: "purchase" as OrderType,
    orderNo: o.orderNo,
    partyName: o.supplierName,
    status: o.status,
    totalAmount: o.totalAmount,
    totalQuantity: o.totalQuantity,
    itemCount: o.itemCount,
    orderDate: o.orderDate
      ? new Date(o.orderDate).toLocaleDateString("zh-CN")
      : "",
    createdAt:
      typeof o.createdAt === "number"
        ? o.createdAt
        : new Date(o.createdAt).getTime(),
  };
}

/** 将销售订单转换为统一记录格式 */
function toSaleRecord(o: BasicSaleOrder): OrderRecord {
  return {
    id: `sale-${o.id}`,
    type: "sale" as OrderType,
    orderNo: o.orderNo,
    partyName: o.customerName,
    status: o.status,
    totalAmount: o.totalAmount,
    totalQuantity: o.totalQuantity,
    itemCount: o.itemCount,
    orderDate: o.orderDate
      ? new Date(o.orderDate).toLocaleDateString("zh-CN")
      : "",
    createdAt:
      typeof o.createdAt === "number"
        ? o.createdAt
        : new Date(o.createdAt).getTime(),
  };
}

/** 加载合并后的订单记录（分页） */
export async function fetchMergedRecords(
  page: number,
): Promise<{ records: OrderRecord[]; hasMore: boolean }> {
  const [purchaseRes, saleRes] = await Promise.all([
    transactionApi.listBasicPurchaseOrdersPage({
      pageIndex: page,
      pageSize: PAGE_SIZE,
    }),
    transactionApi.listBasicSaleOrdersPage({
      pageIndex: page,
      pageSize: PAGE_SIZE,
    }),
  ]);

  const purchaseRecords = (purchaseRes.content ?? []).map(toPurchaseRecord);
  const saleRecords = (saleRes.content ?? []).map(toSaleRecord);
  const merged = [...purchaseRecords, ...saleRecords].sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  const totalP = purchaseRes.totalElements ?? 0;
  const totalS = saleRes.totalElements ?? 0;
  const maxTotal = Math.max(totalP, totalS);

  return {
    records: merged,
    hasMore: (page + 1) * PAGE_SIZE < maxTotal,
  };
}
