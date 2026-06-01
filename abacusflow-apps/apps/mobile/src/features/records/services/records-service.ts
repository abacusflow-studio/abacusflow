import { partnerApi, transactionApi } from "@abacusflow/core";
import type { OrderAction, OrderDetail, OrderRecord, OrderType } from "../types";

const PAGE_SIZE = 20;

type PurchaseRecordSource = {
  id: number;
  orderNo: string;
  supplierName: string;
  status: string;
  totalAmount: number;
  totalQuantity: number;
  itemCount: number;
  orderDate?: Date | number | string | null;
  createdAt: Date | number | string;
};

type SaleRecordSource = {
  id: number;
  orderNo: string;
  customerName: string;
  status: string;
  totalAmount: number;
  totalQuantity: number;
  itemCount: number;
  orderDate?: Date | number | string | null;
  createdAt: Date | number | string;
};

const toTimestamp = (date: Date | number | string) =>
  typeof date === "number" ? date : new Date(date).getTime();

function mapPurchaseRecord(order: PurchaseRecordSource): OrderRecord {
  return {
    id: `purchase-${order.id}`,
    type: "purchase",
    orderNo: order.orderNo,
    partyName: order.supplierName,
    status: order.status,
    totalAmount: order.totalAmount,
    totalQuantity: order.totalQuantity,
    itemCount: order.itemCount,
    orderDate: order.orderDate
      ? new Date(order.orderDate).toLocaleDateString("zh-CN")
      : "",
    createdAt: toTimestamp(order.createdAt),
  };
}

function mapSaleRecord(order: SaleRecordSource): OrderRecord {
  return {
    id: `sale-${order.id}`,
    type: "sale",
    orderNo: order.orderNo,
    partyName: order.customerName,
    status: order.status,
    totalAmount: order.totalAmount,
    totalQuantity: order.totalQuantity,
    itemCount: order.itemCount,
    orderDate: order.orderDate
      ? new Date(order.orderDate).toLocaleDateString("zh-CN")
      : "",
    createdAt: toTimestamp(order.createdAt),
  };
}

function mergeRecords(records: OrderRecord[]) {
  const map = new Map<string, OrderRecord>();
  records.forEach((record) => map.set(record.id, record));
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/** 加载采购订单记录（分页） */
export async function fetchPurchaseRecords(
  page: number,
  keyword = "",
): Promise<{ records: OrderRecord[]; hasMore: boolean }> {
  const query = keyword.trim();
  if (query) {
    const [byOrderNo, bySupplierName] = await Promise.all([
      transactionApi.listBasicPurchaseOrdersPage({
        pageIndex: page,
        pageSize: PAGE_SIZE,
        orderNo: query,
      }),
      transactionApi.listBasicPurchaseOrdersPage({
        pageIndex: page,
        pageSize: PAGE_SIZE,
        supplierName: query,
      }),
    ]);

    return {
      records: mergeRecords([
        ...(byOrderNo.content ?? []).map(mapPurchaseRecord),
        ...(bySupplierName.content ?? []).map(mapPurchaseRecord),
      ]),
      hasMore:
        (page + 1) * PAGE_SIZE < (byOrderNo.totalElements ?? 0) ||
        (page + 1) * PAGE_SIZE < (bySupplierName.totalElements ?? 0),
    };
  }

  const res = await transactionApi.listBasicPurchaseOrdersPage({
    pageIndex: page,
    pageSize: PAGE_SIZE,
  });
  return {
    records: (res.content ?? []).map(mapPurchaseRecord),
    hasMore: (page + 1) * PAGE_SIZE < (res.totalElements ?? 0),
  };
}

/** 加载销售订单记录（分页） */
export async function fetchSaleRecords(
  page: number,
  keyword = "",
): Promise<{ records: OrderRecord[]; hasMore: boolean }> {
  const query = keyword.trim();
  if (query) {
    const [byOrderNo, byCustomerName] = await Promise.all([
      transactionApi.listBasicSaleOrdersPage({
        pageIndex: page,
        pageSize: PAGE_SIZE,
        orderNo: query,
      }),
      transactionApi.listBasicSaleOrdersPage({
        pageIndex: page,
        pageSize: PAGE_SIZE,
        customerName: query,
      }),
    ]);

    return {
      records: mergeRecords([
        ...(byOrderNo.content ?? []).map(mapSaleRecord),
        ...(byCustomerName.content ?? []).map(mapSaleRecord),
      ]),
      hasMore:
        (page + 1) * PAGE_SIZE < (byOrderNo.totalElements ?? 0) ||
        (page + 1) * PAGE_SIZE < (byCustomerName.totalElements ?? 0),
    };
  }

  const res = await transactionApi.listBasicSaleOrdersPage({
    pageIndex: page,
    pageSize: PAGE_SIZE,
  });
  return {
    records: (res.content ?? []).map(mapSaleRecord),
    hasMore: (page + 1) * PAGE_SIZE < (res.totalElements ?? 0),
  };
}

const formatDate = (date?: Date | number | string | null) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("zh-CN");
};

const formatDateTime = (date?: Date | number | string | null) => {
  if (!date) return "";
  return new Date(date).toLocaleString("zh-CN");
};

const getSupplierName = async (id: number) => {
  try {
    const supplier = await partnerApi.getSupplier({ id });
    return supplier.name;
  } catch {
    return undefined;
  }
};

const getCustomerName = async (id: number) => {
  try {
    const customer = await partnerApi.getCustomer({ id });
    return customer.name;
  } catch {
    return undefined;
  }
};

/** 加载订单详情 */
export async function fetchOrderDetail(
  type: OrderType,
  id: number,
): Promise<OrderDetail> {
  if (type === "purchase") {
    const order = await transactionApi.getPurchaseOrder({ id });
    const partyName = await getSupplierName(order.supplierId);
    const items = order.orderItems.map((item) => ({
      id: item.id,
      title: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
      code: item.serialNumber,
    }));

    return {
      id: order.id,
      type,
      orderNo: order.orderNo,
      partyLabel: "供应商",
      partyId: order.supplierId,
      partyName,
      status: order.status,
      orderDate: formatDate(order.orderDate),
      createdAt: formatDateTime(order.createdAt),
      updatedAt: formatDateTime(order.updatedAt),
      note: order.note,
      items,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
    };
  }

  const order = await transactionApi.getSaleOrder({ id });
  const partyName = await getCustomerName(order.customerId);
  const items = order.orderItems.map((item) => ({
    id: item.id,
    title: item.inventoryUnitTitle,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountedPrice: item.discountedPrice,
    subtotal: item.subtotal,
  }));

  return {
    id: order.id,
    type,
    orderNo: order.orderNo,
    partyLabel: "客户",
    partyId: order.customerId,
    partyName,
    status: order.status,
    orderDate: formatDate(order.orderDate),
    createdAt: formatDateTime(order.createdAt),
    updatedAt: formatDateTime(order.updatedAt),
    note: order.note,
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalAmount: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

/** 执行订单状态动作 */
export async function performOrderAction(
  type: OrderType,
  id: number,
  action: OrderAction,
): Promise<void> {
  if (type === "purchase") {
    if (action === "complete") {
      await transactionApi.completePurchaseOrder({ id });
      return;
    }
    if (action === "cancel") {
      await transactionApi.cancelPurchaseOrder({ id });
      return;
    }
    await transactionApi.reversePurchaseOrder({ id });
    return;
  }

  if (action === "complete") {
    await transactionApi.completeSaleOrder({ id });
    return;
  }
  if (action === "cancel") {
    await transactionApi.cancelSaleOrder({ id });
    return;
  }
  await transactionApi.reverseSaleOrder({ id });
}
