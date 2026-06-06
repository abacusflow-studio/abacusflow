"use client";

import { useState, useCallback } from "react";
import type { MessageInstance } from "antd/es/message/interface";
import { translateInventoryUnitType } from "@abacusflow/utils";
import type { SelectableProduct } from "@abacusflow/core";
import {
  inventoryApi,
  partnerApi,
  productApi,
  transactionApi,
} from "@abacusflow/core";
import type { OrderForm, OrderItemForm, SelectOption } from "../components/order-list-types";
import { emptyForm, emptyItem } from "../components/order-list-types";

interface UseOrderCreateOptions {
  orderType: "purchase" | "sale";
  orderLabel: string;
  partnerLabel: string;
  itemLabel: string;
  message: MessageInstance;
  refresh: () => void;
}

export function useOrderCreate({
  orderType,
  orderLabel,
  partnerLabel,
  itemLabel,
  message,
  refresh,
}: UseOrderCreateOptions) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [partnerOptions, setPartnerOptions] = useState<SelectOption[]>([]);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isAssetProduct = useCallback(
    (productId: string) =>
      products.find((p) => String(p.id) === productId)?.type === "asset",
    [products],
  );

  const openCreate = useCallback(async () => {
    setForm(emptyForm());
    setErrors({});
    setShowForm(true);
    setFormLoading(true);
    try {
      if (orderType === "purchase") {
        const [suppliers, selectableProducts] = await Promise.all([
          partnerApi.listSelectableSuppliers(),
          productApi.listSelectableProducts(),
        ]);
        setProducts(selectableProducts);
        setPartnerOptions(
          suppliers.map((s) => ({ label: s.name, value: String(s.id) })),
        );
        setItemOptions(
          selectableProducts.map((p) => ({
            label: `${p.name} / ${p.barcode}`,
            value: String(p.id),
          })),
        );
      } else {
        const [customers, units] = await Promise.all([
          partnerApi.listSelectableCustomers(),
          inventoryApi.listSelectableInventoryUnits({
            statuses: ["normal", "reversed"],
          }),
        ]);
        setPartnerOptions(
          customers.map((c) => ({ label: c.name, value: String(c.id) })),
        );
        setItemOptions(
          units.map((u) => ({
            label: `${u.title} / ${translateInventoryUnitType(u.type)}`,
            value: String(u.id),
          })),
        );
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载表单数据失败");
    } finally {
      setFormLoading(false);
    }
  }, [orderType, message]);

  const updateItem = (index: number, patch: Partial<OrderItemForm>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const addOrderItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  };

  const removeOrderItem = (index: number) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const validate = (currentForm: OrderForm): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!currentForm.partnerId) errs.partnerId = `请选择${partnerLabel}`;
    if (!currentForm.orderDate) errs.orderDate = "请选择订单日期";
    if (currentForm.items.length === 0) errs.items = "请至少添加一条明细";

    currentForm.items.forEach((item, index) => {
      if (!item.itemId) errs[`item-${index}`] = `请选择${itemLabel}`;
      if (!item.quantity || Number(item.quantity) <= 0) {
        errs[`quantity-${index}`] = "请输入大于 0 的数量";
      }
      if (!item.unitPrice || Number(item.unitPrice) < 0) {
        errs[`unitPrice-${index}`] = "请输入不小于 0 的单价";
      }
      if (
        orderType === "purchase" &&
        isAssetProduct(item.itemId) &&
        !item.serialNumber.trim()
      ) {
        errs[`serialNumber-${index}`] = "资产类产品必须填写序列号";
      }
      if (orderType === "sale") {
        const discount = Number(item.discountFactor || "100");
        if (Number.isNaN(discount) || discount < 0 || discount > 100) {
          errs[`discountFactor-${index}`] = "折扣率需在 0 到 100 之间";
        }
      }
    });
    return errs;
  };

  const handleSubmit = async (currentForm: OrderForm) => {
    const errs = validate(currentForm);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      if (orderType === "purchase") {
        await transactionApi.addPurchaseOrder({
          createPurchaseOrderInput: {
            supplierId: Number(currentForm.partnerId),
            orderDate: new Date(currentForm.orderDate),
            note: currentForm.note || undefined,
            orderItems: currentForm.items.map((item) => ({
              productId: Number(item.itemId),
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              serialNumber: item.serialNumber || undefined,
            })),
          },
        });
      } else {
        await transactionApi.addSaleOrder({
          createSaleOrderInput: {
            customerId: Number(currentForm.partnerId),
            orderDate: new Date(currentForm.orderDate),
            note: currentForm.note || undefined,
            orderItems: currentForm.items.map((item) => ({
              inventoryUnitId: Number(item.itemId),
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              discountFactor: item.discountFactor
                ? Number(item.discountFactor) / 100
                : 1,
            })),
          },
        });
      }
      message.success(`新增${orderLabel}单成功`);
      setShowForm(false);
      refresh();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "新增失败");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    showForm,
    setShowForm,
    form,
    setForm,
    formLoading,
    submitting,
    partnerOptions,
    setPartnerOptions,
    itemOptions,
    errors,
    isAssetProduct,
    openCreate,
    updateItem,
    addOrderItem,
    removeOrderItem,
    handleSubmit,
  };
}
