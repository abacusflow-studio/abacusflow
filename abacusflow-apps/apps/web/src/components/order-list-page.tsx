"use client";

import React, { useState } from "react";
import {
  PageHeader, Button, DataTable, StatusTag, Modal,
  FormField, FormInput, FormSelect, FormTextarea,
  type DataTableColumn,
} from "@abacusflow/ui";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { useToast } from "../hooks/use-toast";
import {
  dateToFormattedString,
  timestampToLocaleString,
  translateInventoryUnitType,
  translateOrderStatus,
  type OrderStatus,
} from "@abacusflow/utils";
import type {
  ListOrdersPageRequest,
  OrderItem,
  PageResponse,
  PurchaseOrder,
  SaleOrder,
  SelectableProduct,
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

interface OrderItemForm {
  itemId: string;
  quantity: string;
  unitPrice: string;
  serialNumber: string;
  discountFactor: string;
}

interface OrderForm {
  partnerId: string;
  orderDate: string;
  note: string;
  items: OrderItemForm[];
}

const ORDER_STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: "进行中", value: "pending" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "canceled" },
  { label: "已撤回", value: "reversed" },
];

const emptyItem = (): OrderItemForm => ({
  itemId: "",
  quantity: "1",
  unitPrice: "",
  serialNumber: "",
  discountFactor: "100",
});

const emptyForm = (): OrderForm => ({
  partnerId: "",
  orderDate: new Date().toISOString().slice(0, 10),
  note: "",
  items: [emptyItem()],
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
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const defaultFilters: Partial<ListOrdersPageRequest> =
    orderType === "purchase"
      ? {
          orderNo: undefined,
          supplierName: undefined,
          status: undefined,
          productName: undefined,
          serialNumber: undefined,
          orderDate: undefined,
        }
      : {
          orderNo: undefined,
          customerName: undefined,
          status: undefined,
          inventoryUnitName: undefined,
          orderDate: undefined,
        };

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<Order, ListOrdersPageRequest>({
    fetchFn: listFn,
    defaultFilters,
  });

  const orderLabel = orderType === "purchase" ? "采购" : "销售";
  const itemLabel = orderType === "purchase" ? "产品" : "库存单元";
  const partnerFilterKey = orderType === "purchase" ? "supplierName" : "customerName";

  const openCreate = async () => {
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
    setFormLoading(true);
    try {
      if (orderType === "purchase") {
        const [suppliers, selectableProducts] = await Promise.all([
          supplierApi.listSelectableSuppliers(),
          productApi.listSelectableProducts(),
        ]);
        setProducts(selectableProducts);
        setPartnerOptions(
          suppliers.map((supplier) => ({
            label: supplier.name,
            value: supplier.id,
          })),
        );
        setItemOptions(
          selectableProducts.map((product) => ({
            label: `${product.name} / ${product.barcode}`,
            value: product.id,
          })),
        );
      } else {
        const [customers, selectableInventoryUnits] = await Promise.all([
          customerApi.listSelectableCustomers(),
          inventoryApi.listSelectableInventoryUnits(["normal", "reversed"]),
        ]);
        setPartnerOptions(
          customers.map((customer) => ({
            label: customer.name,
            value: customer.id,
          })),
        );
        setItemOptions(
          selectableInventoryUnits.map((unit) => ({
            label: `${unit.title} / ${translateInventoryUnitType(unit.type)}`,
            value: unit.id,
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

  const updateItem = (index: number, patch: Partial<OrderItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const addOrderItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeOrderItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!form.partnerId) nextErrors.partnerId = `请选择${partnerLabel}`;
    if (!form.orderDate) nextErrors.orderDate = "请选择订单日期";
    if (form.items.length === 0) nextErrors.items = "请至少添加一条明细";

    form.items.forEach((item, index) => {
      if (!item.itemId) nextErrors[`item-${index}`] = `请选择${itemLabel}`;
      if (!item.quantity || Number(item.quantity) <= 0) {
        nextErrors[`quantity-${index}`] = "请输入大于 0 的数量";
      }
      if (!item.unitPrice || Number(item.unitPrice) < 0) {
        nextErrors[`unitPrice-${index}`] = "请输入不小于 0 的单价";
      }
      if (orderType === "sale") {
        const discount = Number(item.discountFactor || "100");
        if (Number.isNaN(discount) || discount < 0 || discount > 100) {
          nextErrors[`discountFactor-${index}`] = "折扣率需在 0 到 100 之间";
        }
      }
    });

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
          orderItems: form.items.map((item) => ({
            productId: Number(item.itemId),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            serialNumber: item.serialNumber || undefined,
          })),
        });
      } else {
        await transactionApi.createSaleOrder({
          customerId: Number(form.partnerId),
          orderDate: form.orderDate,
          note: form.note || undefined,
          orderItems: form.items.map((item) => ({
            inventoryUnitId: Number(item.itemId),
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discountFactor: item.discountFactor ? Number(item.discountFactor) / 100 : 1,
          })),
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
    if (!confirm(`确定${labels[action]}该${orderLabel}单？`)) return;
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
    { key: "totalQuantity", title: "总数量", dataIndex: "totalQuantity" },
    { key: "itemCount", title: "明细数", dataIndex: "itemCount" },
    {
      key: "autoCompleteDate",
      title: "自动完成日期",
      render: (_, record) => dateToFormattedString(record.autoCompleteDate),
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
        record.title ??
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

  const isAssetProduct = (productId: string) =>
    products.find((product) => String(product.id) === productId)?.type === "asset";

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
              placeholder={`请输入${orderLabel}单号`}
            />
          </div>
          <div className="form-item">
            <label>订单日期</label>
            <input
              type="date"
              value={filters.orderDate ?? ""}
              onChange={(e) => updateFilter("orderDate", e.target.value || undefined)}
            />
          </div>
          <div className="form-item">
            <label>{partnerLabel}</label>
            <input
              value={(filters[partnerFilterKey] as string | undefined) ?? ""}
              onChange={(e) => updateFilter(partnerFilterKey, e.target.value || undefined)}
              placeholder={`请输入${partnerLabel}`}
            />
          </div>
          <div className="form-item">
            <label>状态</label>
            <select
              value={filters.status ?? ""}
              onChange={(e) => updateFilter("status", (e.target.value || undefined) as OrderStatus | undefined)}
            >
              <option value="">全部</option>
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          {orderType === "purchase" ? (
            <>
              <div className="form-item">
                <label>产品名称</label>
                <input
                  value={filters.productName ?? ""}
                  onChange={(e) => updateFilter("productName", e.target.value || undefined)}
                  placeholder="请输入产品名称"
                />
              </div>
              <div className="form-item">
                <label>序列号</label>
                <input
                  value={filters.serialNumber ?? ""}
                  onChange={(e) => updateFilter("serialNumber", e.target.value || undefined)}
                  placeholder="请输入序列号"
                />
              </div>
            </>
          ) : (
            <div className="form-item">
              <label>库存单元</label>
              <input
                value={filters.inventoryUnitName ?? ""}
                onChange={(e) => updateFilter("inventoryUnitName", e.target.value || undefined)}
                placeholder="请输入库存单元名"
              />
            </div>
          )}
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
        width={760}
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
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">订单明细</span>
              <Button type="primary" size="small" label="添加明细" onClick={addOrderItem} />
            </div>
            {errors.items && <p className="text-red-500 text-sm">{errors.items}</p>}
            <div className="flex flex-col gap-3">
              {form.items.map((item, index) => (
                <div key={index} className="border border-gray-100 rounded-md p-3">
                  <div className="flex justify-between gap-3 mb-2">
                    <span className="text-sm text-gray-500">明细 {index + 1}</span>
                    {form.items.length > 1 && (
                      <Button type="link" label="删除" onClick={() => removeOrderItem(index)} />
                    )}
                  </div>
                  <FormField label={itemLabel} required error={errors[`item-${index}`]}>
                    <FormSelect
                      value={item.itemId}
                      onChange={(e) => updateItem(index, { itemId: e.target.value })}
                      placeholder={`请选择${itemLabel}`}
                      options={itemOptions}
                      error={!!errors[`item-${index}`]}
                    />
                  </FormField>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="数量" required error={errors[`quantity-${index}`]}>
                      <FormInput
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: e.target.value })}
                        error={!!errors[`quantity-${index}`]}
                      />
                    </FormField>
                    <FormField label="单价" required error={errors[`unitPrice-${index}`]}>
                      <FormInput
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                        error={!!errors[`unitPrice-${index}`]}
                      />
                    </FormField>
                  </div>
                  {orderType === "purchase" ? (
                    <FormField label="序列号">
                      <FormInput
                        value={item.serialNumber}
                        onChange={(e) => updateItem(index, { serialNumber: e.target.value })}
                        placeholder={isAssetProduct(item.itemId) ? "资产类产品建议填写序列号" : "可选"}
                      />
                    </FormField>
                  ) : (
                    <FormField label="折扣率" error={errors[`discountFactor-${index}`]}>
                      <FormInput
                        type="number"
                        min={0}
                        max={100}
                        step="1"
                        value={item.discountFactor}
                        onChange={(e) => updateItem(index, { discountFactor: e.target.value })}
                        placeholder="例如 90 表示九折"
                        error={!!errors[`discountFactor-${index}`]}
                      />
                    </FormField>
                  )}
                </div>
              ))}
            </div>
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
        width={760}
      >
        {detailLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : detailItem ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <DetailRow label="订单编号" value={detailItem.orderNo} />
              <DetailRow label="订单日期" value={dateToFormattedString(detailItem.orderDate)} />
              <DetailRow label={partnerLabel} value={getPartnerValue(detailItem)} />
              <DetailRow label="状态" value={translateOrderStatus(detailItem.status)} />
              <DetailRow label="总金额" value={getTotalAmount(detailItem)} />
              <DetailRow label="备注" value={detailItem.note} />
              <DetailRow label="创建时间" value={formatTimestamp(detailItem.createdAt)} />
              <DetailRow label="更新时间" value={formatTimestamp(detailItem.updatedAt)} />
            </div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>订单明细</h4>
              <DataTable
                columns={itemColumns}
                data={getOrderItems(detailItem)}
                rowKey={(item) =>
                  item.id?.toString() ??
                  `${item.productId ?? item.inventoryUnitId ?? "item"}-${item.quantity}-${item.unitPrice}`
                }
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
      <span style={{ color: "#999", minWidth: 96, flexShrink: 0 }}>{label}：</span>
      <span>{value ?? "-"}</span>
    </div>
  );
}
