"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  InputNumber,
  Select,
  Typography,
  Flex,
  App,
  Space,
} from "antd";
import {
  DownloadOutlined,
  FileTextOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  depotApi,
  inventoryApi,
  productApi,
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

const productTypeOptions = PRODUCT_TYPES.map((t) => ({
  label: t.label,
  value: t.value,
}));

export default function InventoryPage() {
  const { message } = App.useApp();

  const [viewMode, setViewMode] = useState<InventoryViewMode>("units");
  const [filters, setFilters] = useState<InventoryFilters>(defaultFilters);
  const [pageIndex, setPageIndex] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [inventories, setInventories] = useState<BasicInventory[]>([]);
  const [inventoryUnits, setInventoryUnits] = useState<BasicInventoryUnit[]>(
    [],
  );
  const [categories, setCategories] = useState<SelectableProductCategory[]>([]);

  const [actionInventory, setActionInventory] = useState<BasicInventory | null>(
    null,
  );
  const [actionInventoryUnit, setActionInventoryUnit] =
    useState<BasicInventoryUnit | null>(null);
  const [showDepotModal, setShowDepotModal] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [depots, setDepots] = useState<BasicDepot[]>([]);
  const [selectedDepotId, setSelectedDepotId] = useState<number | undefined>();
  const [safetyStock, setSafetyStock] = useState<number | null>(null);
  const [maxStock, setMaxStock] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pageSize = 10;

  const depotOptions = useMemo(
    () => depots.map((d) => ({ label: d.name, value: d.id })),
    [depots],
  );

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
      message.error(err instanceof Error ? err.message : "加载库存失败");
    } finally {
      setLoading(false);
    }
  }, [message, filters, pageIndex, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    productApi
      .listSelectableProductCategories()
      .then(setCategories)
      .catch((err) => {
        console.error(err);
        message.error("加载产品类别失败");
      });
  }, [message]);

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
        inventoryApi.getInventoryUnit({ id: item.id }),
      ]);
      setDepots(depotList);
      setSelectedDepotId(detail.depotId ?? undefined);
    } catch {
      const depotList = await depotApi.listBasicDepots().catch(() => []);
      setDepots(depotList);
    }
    setShowDepotModal(true);
  };

  const openWarningModal = (item: BasicInventory) => {
    setActionInventory(item);
    setSafetyStock(item.safetyStock ?? null);
    setMaxStock(item.maxStock ?? null);
    setShowWarningModal(true);
  };

  const handleAssignDepot = async () => {
    if (!actionInventoryUnit || !selectedDepotId) return;
    setSubmitting(true);
    try {
      await inventoryApi.assignInventoryUnitDepot({
        id: actionInventoryUnit.id,
        assignInventoryUnitDepotRequest: { depotId: selectedDepotId },
      });
      message.success("分配成功");
      setShowDepotModal(false);
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "分配失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateWarning = async () => {
    if (!actionInventory) return;
    if (safetyStock === null || maxStock === null) {
      message.error("请输入有效的预警线");
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.adjustWarningLine({
        id: actionInventory.id,
        adjustWarningLineRequest: { safetyStock, maxStock },
      });
      message.success("更新成功");
      setShowWarningModal(false);
      loadData();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "更新失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async (format: "excel" | "pdf", print = false) => {
    try {
      const blob = await inventoryApi.exportInventory({
        format,
        ...(filters.productCategoryId !== undefined
          ? { productCategoryId: filters.productCategoryId }
          : {}),
      });
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
      message.success("导出成功");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "导出失败");
    }
  };

  const inventoryColumns: ColumnsType<BasicInventory> = [
    { title: "产品名称", dataIndex: "productName", key: "productName" },
    {
      title: "产品规格",
      dataIndex: "productSpecification",
      key: "productSpecification",
    },
    {
      title: "产品类型",
      key: "productType",
      render: (_, record) => translateProductType(record.productType),
    },
    {
      title: "可用总库存",
      dataIndex: "remainingQuantity",
      key: "remainingQuantity",
    },
    { title: "总库存", dataIndex: "quantity", key: "quantity" },
    { title: "初始库存", dataIndex: "initialQuantity", key: "initialQuantity" },
    {
      title: "储存点",
      key: "depotNames",
      render: (_, record) => record.depotNames?.join(", ") || "-",
    },
    {
      title: "库存健康",
      key: "health",
      render: (_, record) =>
        stockHealthLabel(record.quantity, record.safetyStock, record.maxStock),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => {
              setActionInventory(record);
              setShowUnitsModal(true);
            }}
          >
            库存单元
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => openWarningModal(record)}
          >
            调整预警线
          </Button>
        </Space>
      ),
    },
  ];

  const unitColumns: ColumnsType<BasicInventoryUnit> = [
    { title: "库存单元名", dataIndex: "title", key: "title", ellipsis: true },
    {
      title: "类型",
      key: "type",
      render: (_, record) => translateInventoryUnitType(record.type),
    },
    {
      title: "状态",
      key: "status",
      render: (_, record) => translateInventoryUnitStatus(record.status),
    },
    {
      title: "可用库存",
      dataIndex: "remainingQuantity",
      key: "remainingQuantity",
    },
    { title: "库存数量", dataIndex: "quantity", key: "quantity" },
    { title: "初始库存", dataIndex: "initialQuantity", key: "initialQuantity" },
    {
      title: "单价",
      key: "unitPrice",
      render: (_, record) => record.unitPrice?.toLocaleString("zh-CN") ?? "-",
    },
    {
      title: "入库时间",
      key: "receivedAt",
      render: (_, record) => formatDateTime(record.receivedAt),
    },
    {
      title: "采购单号",
      dataIndex: "purchaseOrderNo",
      key: "purchaseOrderNo",
      ellipsis: true,
    },
    {
      title: "销售单号",
      key: "saleOrderNos",
      render: (_, record) => record.saleOrderNos?.join(", ") || "-",
    },
    { title: "储存点", dataIndex: "depotName", key: "depotName" },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Button type="link" size="small" onClick={() => openDepotModal(record)}>
          分配储存点
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          库存管理
        </Typography.Title>
        <Space wrap>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => handleExport("excel")}
          >
            导出 Excel
          </Button>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() => handleExport("pdf")}
          >
            导出 PDF
          </Button>
          <Button
            icon={<PrinterOutlined />}
            onClick={() => handleExport("pdf", true)}
          >
            打印库存
          </Button>
        </Space>
      </Flex>

      <div className="grid grid-cols-[260px_1fr] gap-4 max-lg:grid-cols-1">
        <div className="card self-start">
          <div className="text-xs text-gray-500 mb-2 text-center">
            打印/导出依据所选分类
          </div>
          <div className="text-sm font-semibold mb-3">产品类别</div>
          <CategoryTree
            categories={categories}
            selectedId={filters.productCategoryId}
            onSelect={(categoryId) =>
              updateFilter("productCategoryId", categoryId)
            }
          />
        </div>
        <div>
          <div className="card">
            <div className="form-inline mb-4">
              <div className="form-item">
                <label>产品名</label>
                <Input
                  value={filters.productName ?? ""}
                  onChange={(e) =>
                    updateFilter("productName", e.target.value || undefined)
                  }
                  placeholder="请输入产品名字"
                />
              </div>
              <div className="form-item">
                <label>序列号/批次号</label>
                <Input
                  value={filters.inventoryUnitCode ?? ""}
                  onChange={(e) =>
                    updateFilter(
                      "inventoryUnitCode",
                      e.target.value || undefined,
                    )
                  }
                  placeholder="请输入序列号/批次号"
                />
              </div>
              <div className="form-item">
                <label>产品类型</label>
                <Select
                  value={filters.productType ?? undefined}
                  onChange={(value) =>
                    updateFilter(
                      "productType",
                      value as ProductType | undefined,
                    )
                  }
                  options={productTypeOptions}
                  allowClear
                  placeholder="全部"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="form-item">
                <label>储存点</label>
                <Input
                  value={filters.depotName ?? ""}
                  onChange={(e) =>
                    updateFilter("depotName", e.target.value || undefined)
                  }
                  placeholder="请输入储存点名"
                />
              </div>
              <Button type="primary" onClick={loadData}>
                搜索
              </Button>
              <Button onClick={resetFilters}>重置</Button>
            </div>
          </div>
          <div className="card">
            <div className="mb-3">
              <Button type="primary" size="small" onClick={switchViewMode}>
                {viewMode === "inventories" ? "显示普通表格" : "显示内嵌表格"}
              </Button>
            </div>
            {viewMode === "inventories" ? (
              <Table<BasicInventory>
                columns={inventoryColumns}
                dataSource={inventories}
                rowKey="id"
                loading={loading}
                size="middle"
                pagination={{
                  current: pageIndex,
                  pageSize,
                  total,
                  onChange: setPageIndex,
                  showTotal: (t) => `共 ${t} 条`,
                  showSizeChanger: false,
                }}
              />
            ) : (
              <Table<BasicInventoryUnit>
                columns={unitColumns}
                dataSource={inventoryUnits}
                rowKey="id"
                loading={loading}
                size="middle"
                pagination={{
                  current: pageIndex,
                  pageSize,
                  total,
                  onChange: setPageIndex,
                  showTotal: (t) => `共 ${t} 条`,
                  showSizeChanger: false,
                }}
              />
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showDepotModal}
        title="分配储存点"
        onCancel={() => setShowDepotModal(false)}
        onOk={handleAssignDepot}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <div className="flex flex-col gap-3">
          <label className="text-sm text-gray-500">选择储存点</label>
          <Select
            value={selectedDepotId ?? undefined}
            onChange={(value) =>
              setSelectedDepotId(value as number | undefined)
            }
            options={depotOptions}
            allowClear
            placeholder="请选择"
            style={{ width: "100%" }}
          />
        </div>
      </Modal>

      <Modal
        open={showWarningModal}
        title="调整预警线"
        onCancel={() => setShowWarningModal(false)}
        onOk={handleUpdateWarning}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <div className="flex flex-col gap-3">
          <div className="form-item">
            <label className="text-sm text-gray-500">安全库存</label>
            <InputNumber
              value={safetyStock}
              onChange={(value) => setSafetyStock(value)}
              placeholder="请输入安全库存"
              style={{ width: "100%" }}
              min={0}
            />
          </div>
          <div className="form-item">
            <label className="text-sm text-gray-500">最大库存</label>
            <InputNumber
              value={maxStock}
              onChange={(value) => setMaxStock(value)}
              placeholder="请输入最大库存"
              style={{ width: "100%" }}
              min={0}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={showUnitsModal}
        title="库存单元"
        onCancel={() => setShowUnitsModal(false)}
        footer={null}
        width={900}
        destroyOnHidden
      >
        <Table<BasicInventoryUnit>
          columns={unitColumns}
          dataSource={actionInventory?.units ?? []}
          rowKey="id"
          size="middle"
          pagination={false}
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

function stockHealthLabel(
  value = 0,
  min = 0,
  max = Number.POSITIVE_INFINITY,
): React.ReactNode {
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
