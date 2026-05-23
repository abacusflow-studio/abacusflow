"use client";

import React, { useState } from "react";
import {
  PageHeader, Button, DataTable, StatusTag, Modal,
  FormField, FormInput, FormSelect, FormTextarea,
  type DataTableColumn,
} from "@abacusflow/ui";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { useToast } from "../hooks/use-toast";
import { dateToFormattedString, timestampToLocaleString } from "@abacusflow/utils";
import type {
  BasicProduct,
  Customer,
  InventoryUnit,
  PurchaseOrder,
  SaleOrder,
  OrderItem,
  ListOrdersPageRequest,
  PageResponse,
  Supplier,
} from "@abacusflow/core";
import {
  customerApi,
  inventoryApi,
  productApi,
  supplierApi,
  transactionApi,
} from "@abacusflow/core";

type Order = PurchaseOrder | SaleOrder;
type SelectOption = { label: string; value: string | number };

interface OrderListPageProps {
  title: string;
  orderType: "purchase" | "sale";
  partnerLabel: string;
  partnerKey: "supplierName" | "customerName";
  listFn: (params: ListOrdersPageRequest) => Promise<PageResponse<Order>>;
  getDetailFn: (id: number) => Promise<Order>;
  completeFn: (id: number) => Promise<void>;
  cancelFn: (id: number) => Promise<void>;
  reverseFn: (id: number) => Promise<void>;
}

interface OrderForm {
  partnerId: string;
  orderDate: string;
  note: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
  serialNumber: string;
  discountFactor: string;
}

const emptyForm = (): OrderForm => ({
  partnerId: "",
  orderDate: new Date().toISOString().slice(0, 10),
  note: "",
  itemId: "",
  quantity: "1",
  unitPrice: "",
  serialNumber: "",
  discountFactor: "",
});

export function OrderListPage({
  title,
  orderType,
  partnerLabel,
  partnerKey,
  listFn,
  getDetailFn,
  completeFn,
  cancelFn,
  reverseFn,
}: OrderListPageProps) {
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [partnerOptions, setPartnerOptions] = useState<SelectOption[]>([]);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof OrderForm, string>>>({});

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<Order, ListOrdersPageRequest>({
    fetchFn: listFn,
    defaultFilters: { orderNo: undefined },
  });

  const orderLabel = orderType === "purchase" ? "采购" : "销售";
  const itemLabel = orderType === "purchase" ? "产品" : "库存单元";

  const openCreate = async () => {
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
    setFormLoading(true);
    try {
      if (orderType === "purchase") {
        const [suppliers, products] = await Promise.all([
          supplierApi.listSuppliersPage({ pageIndex: 1, pageSize: 100 }),
          productApi.listBasicProductsPage({ pageIndex: 1, pageSize: 100 }),
        ]);
        setPartnerOptions(
          suppliers.content.map((supplier: Supplier) => ({
            label: supplier.name,
            value: supplier.id,
          })),
        );
        setItemOptions(
          products.content.map((product: BasicProduct) => ({
            label: `${product.name}${product.specification ? ` / ${product.specification}` : ""}`,
            value: product.id,
          })),
        );
      } else {
        const [customers, inventories] = await Promise.all([
          customerApi.listCustomersPage({ pageIndex: 1, pageSize: 100 }),
          inventoryApi.listInventoriesPage({ pageIndex: 1, pageSize: 100 }),
        ]);
        setPartnerOptions(
          customers.content.map((customer: Customer) => ({
            label: customer.name,
            value: customer.id,
          })),
        );
        setItemOptions(
          inventories.content.map((inventory: InventoryUnit) => ({
            label: `${inventory.productName} / 库存 ${inventory.quantity}`,
            value: inventory.id,
          })),
        );
      }
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载表单数据失败");
    } finally {
      setFormLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await getDetailFn(id);
      setDetailItem(item);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载失败");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof OrderForm, string>> = {};
    if (!form.partnerId) nextErrors.partnerId = `请选择${partnerLabel}`;
    if (!form.orderDate) nextErrors.orderDate = "请选择订单日期";
    if (!form.itemId) nextErrors.itemId = `请选择${itemLabel}`;
    if (!form.quantity || Number(form.quantity) <= 0) nextErrors.quantity = "请输入大于 0 的数量";
    if (!form.unitPrice || Number(form.unitPrice) < 0) nextErrors.unitPrice = "请输入不小于 0 的单价";
    if (form.discountFactor) {
      const discount = Number(form.discountFactor);
      if (Number.isNaN(discount) || discount < 0 || discount > 1) {
        nextErrors.discountFactor = "折扣率需在 0 到 1 之间";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (orderType === "purchase") {
        await transactionApi.createPurchaseOrder({
          supplierId: Number(form.partnerId),
          orderDate: form.orderDate,
          note: form.note || undefined,
          orderItems: [
            {
              productId: Number(form.itemId),
              quantity: Number(form.quantity),
              unitPrice: Number(form.unitPrice),
              serialNumber: form.serialNumber || undefined,
            },
          ],
        });
      } else {
        await transactionApi.createSaleOrder({
          customerId: Number(form.partnerId),
          orderDate: form.orderDate,
          note: form.note || undefined,
          orderItems: [
            {
              inventoryUnitId: Number(form.itemId),
              quantity: Number(form.quantity),
              unitPrice: Number(form.unitPrice),
              discountFactor: form.discountFactor ? Number(form.discountFactor) : undefined,
            },
          ],
        });
      }
      addToast("success", `新增${orderLabel}单成功`);
      setShowForm(false);
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "新增失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: number, action: "complete" | "cancel" | "reverse") => {
    const labels = { complete: "完成", cancel: "取消", reverse: "撤回" };
    if (!confirm(`确定${labels[action]}该${orderType === "purchase" ? "采购" : "销售"}单？`)) return;
    try {
      if (action === "complete") await completeFn(id);
      if (action === "cancel") await cancelFn(id);
      if (action === "reverse") await reverseFn(id);
      addToast("success", `${labels[action]}成功`);
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "操作失败");
    }
  };

  const columns: DataTableColumn<Order>[] = [
    { key: "orderNo", title: "订单编号", dataIndex: "orderNo" },
    {
      key: "orderDate",
      title: "订单日期",
      render: (_, record) => dateToFormattedString(record.orderDate),
    },
    {
      key: partnerKey,
      title: partnerLabel,
      render: (_, record) =>
        ((record as unknown as Record<string, unknown>)[partnerKey] as string) ?? "-",
    },
    {
      key: "status",
      title: "状态",
      render: (_, record) => <StatusTag status={record.status} />,
    },
    {
      key: "totalAmount",
      title: "总金额",
      render: (_, record) => record.totalAmount?.toLocaleString("zh-CN") ?? "-",
    },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="link" label="详情" onClick={() => openDetail(record.id)} />
          {record.status === "pending" && (
            <>
              <Button type="link" label="完成" onClick={() => handleAction(record.id, "complete")} />
              <Button type="link" label="取消" onClick={() => handleAction(record.id, "cancel")} />
            </>
          )}
          {record.status === "completed" && (
            <Button type="link" label="撤回" onClick={() => handleAction(record.id, "reverse")} />
          )}
        </div>
      ),
    },
  ];

  const itemColumns: DataTableColumn<OrderItem>[] = [
    {
      key: "productName",
      title: orderType === "purchase" ? "产品" : "库存单元",
      render: (_, record) =>
        record.productName ??
        (record.productId ? `产品 #${record.productId}` : undefined) ??
        (record.inventoryUnitId ? `库存单元 #${record.inventoryUnitId}` : "-"),
    },
    { key: "quantity", title: "数量", dataIndex: "quantity" },
    {
      key: "unitPrice",
      title: "单价",
      render: (_, record) => record.unitPrice?.toLocaleString("zh-CN") ?? "-",
    },
    ...(orderType === "sale"
      ? [
          {
            key: "discountedPrice",
            title: "折扣价",
            render: (_: OrderItem[keyof OrderItem] | undefined, record: OrderItem) =>
              record.discountedPrice?.toLocaleString("zh-CN") ?? "-",
          },
        ]
      : []),
    {
      key: "subtotal",
      title: "小计",
      render: (_, record) => record.subtotal?.toLocaleString("zh-CN") ?? "-",
    },
    { key: "serialNumber", title: "序列号", dataIndex: "serialNumber" },
  ];

  const getOrderItems = (order: Order | null): OrderItem[] =>
    order?.orderItems ?? order?.items ?? [];

  const getTotalAmount = (order: Order): string => {
    const total =
      order.totalAmount ??
      getOrderItems(order).reduce((sum, item) => sum + (item.subtotal ?? 0), 0);
    return total ? total.toLocaleString("zh-CN") : "-";
  };

  const getPartnerValue = (order: Order): string | number | undefined => {
    const value = (order as unknown as Record<string, unknown>)[partnerKey];
    if (typeof value === "string" && value) return value;
    if (orderType === "purchase" && "supplierId" in order) return order.supplierId;
    if (orderType === "sale" && "customerId" in order) return order.customerId;
    return undefined;
  };

  const formatTimestamp = (value?: string | number): string =>
    typeof value === "number" ? timestampToLocaleString(value) : value ?? "";

  return (
    <div>
      <PageHeader
        title={title}
        extra={<Button type="primary" label={`新增${orderLabel}单`} onClick={openCreate} />}
      />
      <div className="card">
        <div className="form-inline mb-4">
          <div className="form-item">
            <label>订单编号</label>
            <input
              value={filters.orderNo ?? ""}
              onChange={(e) => updateFilter("orderNo", e.target.value || undefined)}
              placeholder="请输入订单编号"
            />
          </div>
          <Button type="primary" label="搜索" onClick={handleSearch} />
          <Button label="重置" onClick={handleReset} />
        </div>
      </div>
      <div className="card">
        <DataTable
          columns={columns}
          data={data}
          rowKey="id"
          loading={loading}
          pagination={{ current: pageIndex, pageSize: 10, total, onChange: setPageIndex }}
        />
      </div>

      <Modal
        open={showForm}
        title={`新增${orderLabel}单`}
        onClose={() => setShowForm(false)}
        onOk={handleSubmit}
        okLoading={submitting}
        width={640}
      >
        {formLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : (
          <>
            <FormField label={partnerLabel} required error={errors.partnerId}>
              <FormSelect
                value={form.partnerId}
                onChange={(e) => setForm({ ...form, partnerId: e.target.value })}
                placeholder={`请选择${partnerLabel}`}
                options={partnerOptions}
                error={!!errors.partnerId}
              />
            </FormField>
            <FormField label="订单日期" required error={errors.orderDate}>
              <FormInput
                type="date"
                value={form.orderDate}
                onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                error={!!errors.orderDate}
              />
            </FormField>
            <FormField label={itemLabel} required error={errors.itemId}>
              <FormSelect
                value={form.itemId}
                onChange={(e) => setForm({ ...form, itemId: e.target.value })}
                placeholder={`请选择${itemLabel}`}
                options={itemOptions}
                error={!!errors.itemId}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="数量" required error={errors.quantity}>
                <FormInput
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  error={!!errors.quantity}
                />
              </FormField>
              <FormField label="单价" required error={errors.unitPrice}>
                <FormInput
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  error={!!errors.unitPrice}
                />
              </FormField>
            </div>
            {orderType === "purchase" ? (
              <FormField label="序列号">
                <FormInput
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  placeholder="资产类产品可填写序列号"
                />
              </FormField>
            ) : (
              <FormField label="折扣率" error={errors.discountFactor}>
                <FormInput
                  type="number"
                  min={0}
                  max={1}
                  step="0.01"
                  value={form.discountFactor}
                  onChange={(e) => setForm({ ...form, discountFactor: e.target.value })}
                  placeholder="例如 0.9 表示九折"
                  error={!!errors.discountFactor}
                />
              </FormField>
            )}
            <FormField label="备注">
              <FormTextarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="请输入备注"
              />
            </FormField>
          </>
        )}
      </Modal>

      <Modal
        open={showDetail}
        title={`${orderLabel}单详情`}
        onClose={() => setShowDetail(false)}
        width={720}
      >
        {detailLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : detailItem ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <DetailRow label="订单编号" value={detailItem.orderNo} />
              <DetailRow label="订单日期" value={dateToFormattedString(detailItem.orderDate)} />
              <DetailRow label={partnerLabel} value={getPartnerValue(detailItem)} />
              <DetailRow label="状态" value={detailItem.status === "pending" ? "待处理" : detailItem.status === "completed" ? "已完成" : "已取消"} />
              <DetailRow label="总金额" value={getTotalAmount(detailItem)} />
              {"discountFactor" in detailItem && (
                <DetailRow label="折扣系数" value={(detailItem as SaleOrder).discountFactor?.toString()} />
              )}
              <DetailRow label="创建时间" value={formatTimestamp(detailItem.createdAt)} />
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>订单明细</h4>
              <DataTable
                columns={itemColumns}
                data={getOrderItems(detailItem)}
                rowKey={(item) => item.id?.toString() ?? Math.random().toString()}
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ color: "#999", minWidth: 80, flexShrink: 0 }}>{label}：</span>
      <span>{value ?? "-"}</span>
    </div>
  );
}
