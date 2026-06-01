import { transactionApi } from "@abacusflow/core";
import type { OrderRecord, OrderType } from "../types";

const PAGE_SIZE = 20;

/** 加载采购订单记录（分页） */
export async function fetchPurchaseRecords(
  page: number,
): Promise<{ records: OrderRecord[]; hasMore: boolean }> {
  const res = await transactionApi.listBasicPurchaseOrdersPage({
    pageIndex: page,
    pageSize: PAGE_SIZE,
  });
  const records: OrderRecord[] = (res.content ?? []).map((o) => ({
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
  }));
  return {
    records,
    hasMore: (page + 1) * PAGE_SIZE < (res.totalElements ?? 0),
  };
}

/** 加载销售订单记录（分页） */
export async function fetchSaleRecords(
  page: number,
): Promise<{ records: OrderRecord[]; hasMore: boolean }> {
  const res = await transactionApi.listBasicSaleOrdersPage({
    pageIndex: page,
    pageSize: PAGE_SIZE,
  });
  const records: OrderRecord[] = (res.content ?? []).map((o) => ({
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
  }));
  return {
    records,
    hasMore: (page + 1) * PAGE_SIZE < (res.totalElements ?? 0),
  };
}
