"use client";

import React, { useState } from "react";
import { PageHeader, Button, DataTable, Modal, type DataTableColumn } from "@abacusflow/ui";
import { inventoryApi, depotApi, type InventoryUnit, type BasicDepot } from "@abacusflow/core";
import { translateProductUnit, translateProductType } from "@abacusflow/utils";
import { usePaginatedList } from "../../../hooks/use-paginated-list";
import { useToast } from "../../../hooks/use-toast";

export default function InventoryPage() {
  const { addToast } = useToast();
  const [actionItem, setActionItem] = useState<InventoryUnit | null>(null);
  const [showDepotModal, setShowDepotModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [depots, setDepots] = useState<BasicDepot[]>([]);
  const [selectedDepotId, setSelectedDepotId] = useState<number | undefined>();
  const [safetyStock, setSafetyStock] = useState<string>("");
  const [maxStock, setMaxStock] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<InventoryUnit, { productName?: string }>({
    fetchFn: (params) => inventoryApi.listInventoriesPage(params as Parameters<typeof inventoryApi.listInventoriesPage>[0]),
    defaultFilters: { productName: undefined },
  });

  const openDepotModal = async (item: InventoryUnit) => {
    setActionItem(item);
    setSelectedDepotId(item.depotId);
    try {
      const list = await depotApi.listBasicDepots();
      setDepots(list);
    } catch {
      // ignore
    }
    setShowDepotModal(true);
  };

  const openWarningModal = (item: InventoryUnit) => {
    setActionItem(item);
    setSafetyStock(item.safetyStock?.toString() ?? "");
    setMaxStock(item.maxStock?.toString() ?? "");
    setShowWarningModal(true);
  };

  const handleAssignDepot = async () => {
    if (!actionItem || !selectedDepotId) return;
    setSubmitting(true);
    try {
      await inventoryApi.assignDepot({ inventoryId: actionItem.id, depotId: selectedDepotId });
      addToast("success", "分配成功");
      setShowDepotModal(false);
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "分配失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateWarning = async () => {
    if (!actionItem) return;
    setSubmitting(true);
    try {
      await inventoryApi.updateWarningLine({
        inventoryId: actionItem.id,
        safetyStock: safetyStock ? Number(safetyStock) : undefined,
        maxStock: maxStock ? Number(maxStock) : undefined,
      });
      addToast("success", "更新成功");
      setShowWarningModal(false);
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: DataTableColumn<InventoryUnit>[] = [
    { key: "productName", title: "产品名称", dataIndex: "productName" },
    {
      key: "productUnit",
      title: "单位",
      render: (_, record) => translateProductUnit(record.productUnit),
    },
    {
      key: "productType",
      title: "产品类型",
      render: (_, record) => translateProductType(record.productType),
    },
    { key: "categoryName", title: "产品类别", dataIndex: "categoryName" },
    { key: "depotName", title: "储存点", dataIndex: "depotName" },
    { key: "quantity", title: "库存数量", dataIndex: "quantity" },
    {
      key: "health",
      title: "库存健康",
      render: (_, record) => {
        if (record.safetyStock && record.quantity < record.safetyStock) {
          return <span style={{ color: "#ff4d4f" }}>低于安全库存</span>;
        }
        if (record.maxStock && record.quantity > record.maxStock) {
          return <span style={{ color: "#fa8c16" }}>超出最大库存</span>;
        }
        return <span style={{ color: "#52c41a" }}>正常</span>;
      },
    },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div style={{ display: "flex", gap: 8 }}>
          <Button type="link" label="分配储存点" onClick={() => openDepotModal(record)} />
          <Button type="link" label="调整预警线" onClick={() => openWarningModal(record)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="库存管理" />
      <div className="card">
        <div className="form-inline" style={{ marginBottom: 16 }}>
          <div className="form-item">
            <label>产品名称</label>
            <input
              value={filters.productName ?? ""}
              onChange={(e) => updateFilter("productName", e.target.value || undefined)}
              placeholder="请输入产品名称"
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
        open={showDepotModal}
        title="分配储存点"
        onClose={() => setShowDepotModal(false)}
        onOk={handleAssignDepot}
        okLoading={submitting}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, color: "#666" }}>选择储存点</label>
          <select
            value={selectedDepotId ?? ""}
            onChange={(e) => setSelectedDepotId(Number(e.target.value) || undefined)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d9d9d9" }}
          >
            <option value="">请选择</option>
            {depots.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </Modal>

      <Modal
        open={showWarningModal}
        title="调整预警线"
        onClose={() => setShowWarningModal(false)}
        onOk={handleUpdateWarning}
        okLoading={submitting}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="form-item">
            <label style={{ fontSize: 13, color: "#666" }}>安全库存</label>
            <input
              type="number"
              value={safetyStock}
              onChange={(e) => setSafetyStock(e.target.value)}
              placeholder="请输入安全库存"
            />
          </div>
          <div className="form-item">
            <label style={{ fontSize: 13, color: "#666" }}>最大库存</label>
            <input
              type="number"
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
              placeholder="请输入最大库存"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
