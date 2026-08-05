import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import type { BasicInventory } from "@abacusflow/core";
import { COLORS, translateProductType } from "@abacusflow/utils";
import { DetailScreen } from "@components/layout/detail-screen";

import { getInventoryById } from "../services/inventory-service";
import { useWarningLineEditor } from "../hooks/use-warning-line-editor";
import { WarningLineEditor } from "../components/warning-line-editor";

export default function InventoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inventoryId = Number(id);
  const [data, setData] = useState<BasicInventory | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const item = await getInventoryById(inventoryId);
      setData(item);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [inventoryId]);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const item = await getInventoryById(inventoryId);
        if (active) setData(item);
      } catch (err) {
        console.error(err);
        if (active) setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      active = false;
    };
  }, [inventoryId]);

  const warningEditor = useWarningLineEditor(inventoryId, data, loadData);
  const { syncFromData } = warningEditor;

  // Sync warning editor state when data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      syncFromData(data);
    }, 0);
    return () => clearTimeout(timer);
  }, [data, syncFromData]);

  const getHealthStatus = (item: BasicInventory) => {
    if (item.safetyStock && item.quantity < item.safetyStock) {
      return { text: "低库存", color: COLORS.danger };
    }
    if (item.maxStock && item.quantity > item.maxStock) {
      return { text: "超量", color: COLORS.warning };
    }
    return { text: "正常", color: COLORS.success };
  };

  return (
    <DetailScreen
      loading={loading}
      data={data}
      emptyMessage="库存记录不存在"
      title={(d) => d.productName}
      badge={(d) => {
        const health = getHealthStatus(d);
        return {
          text: health.text,
          color: health.color,
          bgColor: health.color + "20",
        };
      }}
      fields={(d) => [
        { label: "产品类型", value: translateProductType(d.productType) },
        { label: "当前数量", value: d.quantity },
        { label: "可用数量", value: d.remainingQuantity },
        { label: "初始数量", value: d.initialQuantity },
        { label: "规格", value: d.productSpecification },
        { label: "储存点", value: d.depotNames.join("、") || "未分配" },
      ]}
    >
      <WarningLineEditor
        editing={warningEditor.editingWarning}
        safetyStock={warningEditor.safetyStock}
        maxStock={warningEditor.maxStock}
        displaySafetyStock={data?.safetyStock}
        displayMaxStock={data?.maxStock}
        onSafetyStockChange={warningEditor.setSafetyStock}
        onMaxStockChange={warningEditor.setMaxStock}
        onToggle={warningEditor.toggleEditing}
        onSave={warningEditor.handleUpdateWarning}
      />
    </DetailScreen>
  );
}
