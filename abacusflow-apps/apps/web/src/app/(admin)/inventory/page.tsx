"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  DataTable,
  Modal,
  PageHeader,
  type DataTableColumn,
} from "@abacusflow/ui";
import {
  depotApi,
  inventoryApi,
  productCategoryApi,
  type BasicDepot,
  type BasicInventory,
  type BasicInventoryUnit,
  type SelectableProductCategory,
} from "@abacusflow/core";
import {
  PRODUCT_TYPES,
  timestampToLocaleString,
  translateInventoryUnitStatus,
  translateInventoryUnitType,
  translateProductType,
  type ProductType,
} from "@abacusflow/utils";
import { useToast } from "../../../hooks/use-toast";

type InventoryViewMode = "units" | "inventories";

interface InventoryFilters {
  productCategoryId?: number;
  productName?: string;
  inventoryUnitCode?: string;
  productType?: ProductType;
  depotName?: string;
}

const defaultFilters: InventoryFilters = {
  productCategoryId: undefined,
  productName: undefined,
  inventoryUnitCode: undefined,
  productType: undefined,
  depotName: undefined,
};

export default function InventoryPage() {
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<InventoryViewMode>("units");
  const [filters, setFilters] = useState<InventoryFilters>(defaultFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [inventories, setInventories] = useState<BasicInventory[]>([]);
  const [inventoryUnits, setInventoryUnits] = useState<BasicInventoryUnit[]>([]);
  const [categories, setCategories] = useState<SelectableProductCategory[]>([]);

  const [actionInventory, setActionInventory] = useState<BasicInventory | null>(null);
  const [actionInventoryUnit, setActionInventoryUnit] = useState<BasicInventoryUnit | null>(null);
  const [showDepotModal, setShowDepotModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [depots, setDepots] = useState<BasicDepot[]>([]);
  const [selectedDepotId, setSelectedDepotId] = useState<number | undefined>();
  const [safetyStock, setSafetyStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pageSize = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        pageIndex,
        pageSize,
      };
      if (viewMode === "inventories") {
        const page = await inventoryApi.listBasicInventoriesPage(params);
        setInventories(page.content ?? []);
        setTotal(page.totalElements);
      } else {
        const page = await inventoryApi.listBasicInventoryUnitsPage(params);
        setInventoryUnits(page.content ?? []);
        setTotal(page.totalElements);
      }
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载库存失败");
    } finally {
      setLoading(false);
    }
  }, [addToast, filters, pageIndex, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    productCategoryApi
      .listSelectableCategories()
      .then(setCategories)
      .catch((err) => {
        console.error(err);
        addToast("error", "加载产品类别失败");
      });
  }, [addToast]);

  const updateFilter = <K extends keyof InventoryFilters>(
    key: K,
    value: InventoryFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPageIndex(1);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setPageIndex(1);
  };

  const switchViewMode = () => {
    setViewMode((prev) => (prev === "units" ? "inventories" : "units"));
    setPageIndex(1);
  };

  const openDepotModal = async (item: BasicInventoryUnit) => {
    setActionInventoryUnit(item);
    setSelectedDepotId(undefined);
    try {
      const [depotList, detail] = await Promise.all([
        depotApi.listBasicDepots(),
        inventoryApi.getInventoryUnit(item.id),
      ]);
      setDepots(depotList);
      setSelectedDepotId(detail.depotId);
    } catch {
      const depotList = await depotApi.listBasicDepots().catch(() => []);
      setDepots(depotList);
    }
    setShowDepotModal(true);
  };

  const openWarningModal = (item: BasicInventory) => {
    setActionInventory(item);
    setSafetyStock(item.safetyStock?.toString() ?? "");
    setMaxStock(item.maxStock?.toString() ?? "");
    setShowWarningModal(true);
  };

  const handleAssignDepot = async () => {
    if (!actionInventoryUnit || !selectedDepotId) return;
    setSubmitting(true);
    try {
      await inventoryApi.assignDepot({
        inventoryUnitId: actionInventoryUnit.id,
        depotId: selectedDepotId,
      });
      addToast("success", "分配成功");
      setShowDepotModal(false);
      loadData();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "分配失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateWarning = async () => {
    if (!actionInventory) return;
    const nextSafetyStock = Number(safetyStock);
    const nextMaxStock = Number(maxStock);
    if (Number.isNaN(nextSafetyStock) || Number.isNaN(nextMaxStock)) {
      addToast("error", "请输入有效的预警线");
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.updateWarningLine({
        inventoryId: actionInventory.id,
        safetyStock: nextSafetyStock,
        maxStock: nextMaxStock,
      });
      addToast("success", "更新成功");
      setShowWarningModal(false);
      loadData();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (format: "excel" | "pdf", print = false) => {
    try {
      const blob = await inventoryApi.exportInventory(format, filters.productCategoryId);
      const url = URL.createObjectURL(blob);
      if (print) {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        iframe.onload = () => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        };
        document.body.appendChild(iframe);
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `inventory-${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : "pdf"}`;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
      addToast("success", "导出成功");
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "导出失败");
    }
  };

  const inventoryColumns: DataTableColumn<BasicInventory>[] = [
    { key: "productName", title: "产品名称", dataIndex: "productName" },
    { key: "productSpecification", title: "产品规格", dataIndex: "productSpecification" },
    {
      key: "productType",
      title: "产品类型",
      render: (_, record) => translateProductType(record.productType),
    },
    { key: "remainingQuantity", title: "可用总库存", dataIndex: "remainingQuantity" },
    { key: "quantity", title: "总库存", dataIndex: "quantity" },
    { key: "initialQuantity", title: "初始库存", dataIndex: "initialQuantity" },
    {
      key: "depotNames",
      title: "储存点",
      render: (_, record) => record.depotNames?.join(", ") || "-",
    },
    {
      key: "health",
      title: "库存健康",
      render: (_, record) => stockHealthLabel(record.quantity, record.safetyStock, record.maxStock),
    },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            type="link"
            label="库存单元"
            onClick={() => {
              setActionInventory(record);
              setShowUnitsModal(true);
            }}
          />
          <Button type="link" label="调整预警线" onClick={() => openWarningModal(record)} />
        </div>
      ),
    },
  ];

  const unitColumns: DataTableColumn<BasicInventoryUnit>[] = [
    { key: "title", title: "库存单元名", dataIndex: "title", ellipsis: true },
    {
      key: "type",
      title: "类型",
      render: (_, record) => translateInventoryUnitType(record.type),
    },
    {
      key: "status",
      title: "状态",
      render: (_, record) => translateInventoryUnitStatus(record.status),
    },
    { key: "remainingQuantity", title: "可用库存", dataIndex: "remainingQuantity" },
    { key: "quantity", title: "库存数量", dataIndex: "quantity" },
    { key: "initialQuantity", title: "初始库存", dataIndex: "initialQuantity" },
    {
      key: "unitPrice",
      title: "单价",
      render: (_, record) => record.unitPrice?.toLocaleString("zh-CN") ?? "-",
    },
    {
      key: "receivedAt",
      title: "入库时间",
      render: (_, record) => formatDateTime(record.receivedAt),
    },
    { key: "purchaseOrderNo", title: "采购单号", dataIndex: "purchaseOrderNo", ellipsis: true },
    {
      key: "saleOrderNos",
      title: "销售单号",
      render: (_, record) => record.saleOrderNos?.join(", ") || "-",
    },
    { key: "depotName", title: "储存点", dataIndex: "depotName" },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <Button type="link" label="分配储存点" onClick={() => openDepotModal(record)} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="库存管理"
        extra={
          <div className="flex flex-wrap gap-2">
            <Button type="primary" label="导出 Excel" onClick={() => handleExport("excel")} />
            <Button type="primary" label="导出 PDF" onClick={() => handleExport("pdf")} />
            <Button label="打印库存" onClick={() => handleExport("pdf", true)} />
          </div>
        }
      />
      <div className="grid grid-cols-[260px_1fr] gap-4 max-lg:grid-cols-1">
        <div className="card self-start">
          <div className="text-xs text-gray-500 mb-2 text-center">打印/导出依据所选分类</div>
          <div className="text-sm font-semibold mb-3">产品类别</div>
          <CategoryTree
            categories={categories}
            selectedId={filters.productCategoryId}
            onSelect={(categoryId) => updateFilter("productCategoryId", categoryId)}
          />
        </div>
        <div>
          <div className="card">
            <div className="form-inline mb-4">
              <div className="form-item">
                <label>产品名</label>
                <input
                  value={filters.productName ?? ""}
                  onChange={(e) => updateFilter("productName", e.target.value || undefined)}
                  placeholder="请输入产品名字"
                />
              </div>
              <div className="form-item">
                <label>序列号/批次号</label>
                <input
                  value={filters.inventoryUnitCode ?? ""}
                  onChange={(e) => updateFilter("inventoryUnitCode", e.target.value || undefined)}
                  placeholder="请输入序列号/批次号"
                />
              </div>
              <div className="form-item">
                <label>产品类型</label>
                <select
                  value={filters.productType ?? ""}
                  onChange={(e) => updateFilter("productType", (e.target.value || undefined) as ProductType | undefined)}
                >
                  <option value="">全部</option>
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-item">
                <label>储存点</label>
                <input
                  value={filters.depotName ?? ""}
                  onChange={(e) => updateFilter("depotName", e.target.value || undefined)}
                  placeholder="请输入储存点名"
                />
              </div>
              <Button type="primary" label="搜索" onClick={loadData} />
              <Button label="重置" onClick={resetFilters} />
            </div>
          </div>
          <div className="card">
            <div className="mb-3">
              <Button
                type="primary"
                size="small"
                label={viewMode === "inventories" ? "显示普通表格" : "显示内嵌表格"}
                onClick={switchViewMode}
              />
            </div>
            {viewMode === "inventories" ? (
              <DataTable
                columns={inventoryColumns}
                data={inventories}
                rowKey="id"
                loading={loading}
                pagination={{
                  current: pageIndex,
                  pageSize,
                  total,
                  onChange: setPageIndex,
                }}
              />
            ) : (
              <DataTable
                columns={unitColumns}
                data={inventoryUnits}
                rowKey="id"
                loading={loading}
                pagination={{
                  current: pageIndex,
                  pageSize,
                  total,
                  onChange: setPageIndex,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showDepotModal}
        title="分配储存点"
        onClose={() => setShowDepotModal(false)}
        onOk={handleAssignDepot}
        okLoading={submitting}
      >
        <div className="flex flex-col gap-3">
          <label className="text-sm text-gray-500">选择储存点</label>
          <select
            value={selectedDepotId ?? ""}
            onChange={(e) => setSelectedDepotId(Number(e.target.value) || undefined)}
            className="px-3 py-1.5 rounded-md border border-gray-300"
          >
            <option value="">请选择</option>
            {depots.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
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
        <div className="flex flex-col gap-3">
          <div className="form-item">
            <label className="text-sm text-gray-500">安全库存</label>
            <input
              type="number"
              value={safetyStock}
              onChange={(e) => setSafetyStock(e.target.value)}
              placeholder="请输入安全库存"
            />
          </div>
          <div className="form-item">
            <label className="text-sm text-gray-500">最大库存</label>
            <input
              type="number"
              value={maxStock}
              onChange={(e) => setMaxStock(e.target.value)}
              placeholder="请输入最大库存"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={showUnitsModal}
        title="库存单元"
        onClose={() => setShowUnitsModal(false)}
        width={900}
      >
        <DataTable
          columns={unitColumns}
          data={actionInventory?.units ?? []}
          rowKey="id"
        />
      </Modal>
    </div>
  );
}

function CategoryTree({
  categories,
  selectedId,
  onSelect,
}: {
  categories: SelectableProductCategory[];
  selectedId?: number;
  onSelect: (id: number | undefined) => void;
}) {
  const childrenByParent = useMemo(() => {
    const map = new Map<number | undefined, SelectableProductCategory[]>();
    for (const category of categories) {
      const parentId = category.parentId ?? undefined;
      const list = map.get(parentId) ?? [];
      list.push(category);
      map.set(parentId, list);
    }
    return map;
  }, [categories]);

  const renderNodes = (parentId?: number, depth = 0): React.ReactNode => {
    const nodes = childrenByParent.get(parentId) ?? [];
    return nodes.map((category) => (
      <div key={category.id}>
        <button
          type="button"
          onClick={() => onSelect(category.id)}
          className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${selectedId === category.id ? "bg-blue-50 text-blue-600 font-semibold" : "hover:bg-gray-50"}`}
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          {category.name}
        </button>
        {renderNodes(category.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${selectedId === undefined ? "bg-blue-50 text-blue-600 font-semibold" : "hover:bg-gray-50"}`}
      >
        全部类别
      </button>
      {renderNodes(undefined)}
    </div>
  );
}

function stockHealthLabel(value = 0, min = 0, max = Number.POSITIVE_INFINITY): React.ReactNode {
  let color = "text-green-600";
  let label = "库存健康";

  if (value < min * 0.5) {
    color = "text-red-600";
    label = "严重低于安全库存";
  } else if (value < min) {
    color = "text-orange-500";
    label = "低于安全库存";
  } else if (value > max * 1.2) {
    color = "text-red-600";
    label = "严重超出最大库存";
  } else if (value > max) {
    color = "text-orange-500";
    label = "超出最大库存";
  }

  return <span className={color}>{label}</span>;
}

function formatDateTime(value?: string | number): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") return timestampToLocaleString(value);
  return value;
}
