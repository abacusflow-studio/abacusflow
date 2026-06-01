import { useState, useCallback } from "react";
import { Alert } from "react-native";
import type { BasicInventory } from "@abacusflow/core";
import { adjustWarningLine } from "../services/inventory-service";

/**
 * 预警线编辑 hook
 * 封装预警线的编辑状态、校验和提交
 */
export function useWarningLineEditor(
  inventoryId: number,
  data: BasicInventory | null,
  onUpdated: () => void,
) {
  const [editingWarning, setEditingWarning] = useState(false);
  const [safetyStock, setSafetyStock] = useState(
    data?.safetyStock?.toString() ?? "",
  );
  const [maxStock, setMaxStock] = useState(
    data?.maxStock?.toString() ?? "",
  );

  /** 当 data 变化时同步初始值 */
  const syncFromData = useCallback((item: BasicInventory | null) => {
    setSafetyStock(item?.safetyStock?.toString() ?? "");
    setMaxStock(item?.maxStock?.toString() ?? "");
  }, []);

  /** 切换编辑模式 */
  const toggleEditing = useCallback(() => {
    setEditingWarning((prev) => !prev);
  }, []);

  /** 提交预警线更新 */
  const handleUpdateWarning = useCallback(async () => {
    if (!safetyStock.trim()) {
      Alert.alert("提示", "请输入安全库存");
      return;
    }
    if (!maxStock.trim()) {
      Alert.alert("提示", "请输入最大库存");
      return;
    }

    const nextSafetyStock = Number(safetyStock);
    const nextMaxStock = Number(maxStock);

    if (
      Number.isNaN(nextSafetyStock) ||
      Number.isNaN(nextMaxStock) ||
      nextSafetyStock < 0 ||
      nextMaxStock < 0
    ) {
      Alert.alert("提示", "预警线需为不小于 0 的数字");
      return;
    }

    try {
      await adjustWarningLine(inventoryId, nextSafetyStock, nextMaxStock);
      setEditingWarning(false);
      onUpdated();
    } catch (error) {
      Alert.alert(
        "错误",
        error instanceof Error ? error.message : "更新预警线失败",
      );
    }
  }, [inventoryId, safetyStock, maxStock, onUpdated]);

  return {
    editingWarning,
    safetyStock,
    setSafetyStock,
    maxStock,
    setMaxStock,
    toggleEditing,
    handleUpdateWarning,
    syncFromData,
  };
}
