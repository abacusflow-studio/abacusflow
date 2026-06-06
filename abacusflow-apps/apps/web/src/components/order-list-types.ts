import type {
  OrderItem,
  PageResponse,
  PurchaseOrder,
  BasicPurchaseOrder,
  SaleOrder,
  BasicSaleOrder,
} from "@abacusflow/core";
import type { OrderStatus } from "@abacusflow/utils";
import { timestampToLocaleString } from "@abacusflow/utils";

export type Order =
  | PurchaseOrder
  | BasicPurchaseOrder
  | SaleOrder
  | BasicSaleOrder;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyPageResponse = PageResponse<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyParams = Record<string, any>;
export type SelectOption = { label: string; value: string | number };

export interface OrderListPageProps {
  title: string;
  orderType: "purchase" | "sale";
  partnerLabel: string;
  partnerKey: "supplierName" | "customerName";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listFn: (params: any) => Promise<AnyPageResponse>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getDetailFn: (id: number) => Promise<any>;
  completeFn: (id: number) => Promise<void>;
  cancelFn: (id: number) => Promise<void>;
  reverseFn: (id: number) => Promise<void>;
}

export interface OrderItemForm {
  itemId: string;
  quantity: string;
  unitPrice: string;
  serialNumber: string;
  discountFactor: string;
}

export interface OrderForm {
  partnerId: string;
  orderDate: string;
  note: string;
  items: OrderItemForm[];
}

export const ORDER_STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: "进行中", value: "pending" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "canceled" },
  { label: "已撤回", value: "reversed" },
];

export const emptyItem = (): OrderItemForm => ({
  itemId: "",
  quantity: "1",
  unitPrice: "",
  serialNumber: "",
  discountFactor: "100",
});

export const emptyForm = (): OrderForm => ({
  partnerId: "",
  orderDate: new Date().toISOString().slice(0, 10),
  note: "",
  items: [emptyItem()],
});

function getField<T>(order: Order, key: string): T | undefined {
  return (order as unknown as Record<string, unknown>)[key] as T | undefined;
}

export function getOrderItems(order: Order | null): OrderItem[] {
  if (!order) return [];
  return (
    getField<OrderItem[]>(order, "orderItems") ??
    getField<OrderItem[]>(order, "items") ??
    []
  );
}

export function getTotalAmount(order: Order): string {
  const total =
    getField<number>(order, "totalAmount") ??
    getOrderItems(order).reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
  return total ? total.toLocaleString("zh-CN") : "-";
}

export function getPartnerValue(
  order: Order,
  partnerKey: "supplierName" | "customerName",
  orderType: "purchase" | "sale",
): string | number | undefined {
  const value = getField<unknown>(order, partnerKey);
  if (typeof value === "string" && value) return value;
  if (orderType === "purchase" && "supplierId" in order) return order.supplierId;
  if (orderType === "sale" && "customerId" in order) return order.customerId;
  return undefined;
}

export function formatTimestamp(value?: string | number): string {
  return typeof value === "number" ? timestampToLocaleString(value) : (value ?? "");
}
