import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { dateToFormattedString } from "@abacusflow/utils";

/**
 * 通用订单表单 hook
 * 封装订单项目管理、金额计算、校验、提交、重置
 */
export function useOrderForm<
  T extends { quantity: string; unitPrice: string },
>() {
  const [items, setItems] = useState<T[]>([]);
  const [orderDate, setOrderDate] = useState(
    dateToFormattedString(new Date().toISOString()),
  );
  const [note, setNote] = useState("");
  const [showMore, setShowMore] = useState(false);

  /** 计算总金额 */
  const totalAmount = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);

  /** 更新单个项目的字段 */
  const updateItem = useCallback(
    (index: number, field: keyof T, value: string) => {
      setItems((prev) =>
        prev.map((item, i) =>
          i === index ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  /** 删除项目 */
  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /** 校验所有项目 */
  const validateItems = useCallback(
    (nameField: keyof T): boolean => {
      for (const item of items) {
        const qty = Number(item.quantity);
        const price = Number(item.unitPrice);
        const name = String(item[nameField]);
        if (!item.quantity || Number.isNaN(qty) || qty <= 0) {
          Alert.alert("提示", `${name} 的数量需大于 0`);
          return false;
        }
        if (!item.unitPrice || Number.isNaN(price) || price < 0) {
          Alert.alert("提示", `${name} 的单价不能为负`);
          return false;
        }
      }
      return true;
    },
    [items],
  );

  /** 重置表单 */
  const resetForm = useCallback(() => {
    setItems([]);
    setNote("");
    setOrderDate(dateToFormattedString(new Date().toISOString()));
  }, []);

  return {
    items,
    setItems,
    orderDate,
    setOrderDate,
    note,
    setNote,
    showMore,
    setShowMore,
    totalAmount,
    updateItem,
    removeItem,
    validateItems,
    resetForm,
  };
}
