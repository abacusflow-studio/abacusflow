"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Table,
  Modal,
  Input,
  InputNumber,
  Select,
  App,
  Space,
  Typography,
  Form,
  Checkbox,
  Popover,
  Statistic,
  Progress,
  Tooltip,
} from "antd";
import {
  DownloadOutlined,
  FileTextOutlined,
  PrinterOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "../../../components/admin-page-header";
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
import { CategoryTree } from "../../../components/category-tree";

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
  const router = useRouter();
  const [warningForm] = Form.useForm();
  const [depotForm] = Form.useForm();

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
  const [submitting, setSubmitting] = useState(false);

  const unitColumnOptions = [
    { label: "类型", value: "type" },
    { label: "状态", value: "status" },
    { label: "库存进度", value: "stockProgress" },
    { label: "单价", value: "unitPrice" },
    { label: "入库时间", value: "receivedAt" },
    { label: "采购单号", value: "purchaseOrderNo" },
    { label: "销售单号", value: "saleOrderNos" },
    { label: "储存点", value: "depotName" },
    { label: "操作", value: "action" },
  ];
  const [visibleUnitKeys, setVisibleUnitKeys] = useState<string[]>(
    unitColumnOptions.map((o) => o.value),
  );

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
    depotForm.resetFields();
    try {
      const [depotList, detail] = await Promise.all([
        depotApi.listBasicDepots(),
        inventoryApi.getInventoryUnit({ id: item.id }),
      ]);
      setDepots(depotList);
      depotForm.setFieldsValue({ depotId: detail.depotId ?? undefined });
    } catch {
      const depotList = await depotApi.listBasicDepots().catch(() => []);
      setDepots(depotList);
    }
    setShowDepotModal(true);
  };

  const openWarningModal = (item: BasicInventory) => {
    setActionInventory(item);
    warningForm.setFieldsValue({
      safetyStock: item.safetyStock ?? undefined,
      maxStock: item.maxStock ?? undefined,
    });
    setShowWarningModal(true);
  };

  const handleAssignDepot = async () => {
    if (!actionInventoryUnit) return;
    try {
      const values = await depotForm.validateFields();
      setSubmitting(true);
      await inventoryApi.assignInventoryUnitDepot({
        id: actionInventoryUnit.id,
        assignInventoryUnitDepotRequest: { depotId: values.depotId },
      });
      message.success("分配成功");
      setShowDepotModal(false);
      loadData();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateWarning = async () => {
    if (!actionInventory) return;
    try {
      const values = await warningForm.validateFields();
      setSubmitting(true);
      await inventoryApi.adjustWarningLine({
        id: actionInventory.id,
        adjustWarningLineRequest: {
          safetyStock: values.safetyStock,
          maxStock: values.maxStock,
        },
      });
      message.success("更新成功");
      setShowWarningModal(false);
      loadData();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
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
    {
      title: "库存单元名",
      dataIndex: "title",
      key: "title",
      width: 360,
      render: (value: string) => (
        <span style={{ fontSize: 16, fontWeight: 600 }}>{value}</span>
      ),
    },
    {
      title: "类型",
      key: "type",
      width: 90,
      render: (_, record) => translateInventoryUnitType(record.type),
    },
    {
      title: "状态",
      key: "status",
      width: 80,
      render: (_, record) => translateInventoryUnitStatus(record.status),
    },
    {
      title: "库存进度",
      key: "stockProgress",
      width: 180,
      render: (_, record) => {
        const remaining = record.remainingQuantity ?? 0;
        const quantity = record.quantity ?? 0;
        const initial = record.initialQuantity ?? 0;
        const percent =
          initial > 0 ? Math.round((remaining / initial) * 100) : 0;
        const strokeColor =
          percent >= 50 ? "#52c41a" : percent >= 20 ? "#faad14" : "#cf1322";
        const reserved = quantity - remaining;
        return (
          <Tooltip
            title={
              <div style={{ lineHeight: 1.8 }}>
                <div>可用库存：{remaining}</div>
                <div>当前实际库存：{quantity}</div>
                <div>初始库存：{initial}</div>
                {reserved > 0 && (
                  <div style={{ marginTop: 4, opacity: 0.85 }}>
                    已预留：{reserved}
                  </div>
                )}
              </div>
            }
          >
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: strokeColor }}>
                  {remaining}
                </span>
                <span style={{ color: "rgba(0,0,0,0.45)" }}>
                  {" / "}
                  {initial}
                </span>
              </div>
              <Progress
                percent={percent}
                showInfo={false}
                size="small"
                strokeColor={strokeColor}
              />
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "单价",
      key: "unitPrice",
      width: 130,
      align: "right",
      render: (_, record) =>
        record.unitPrice != null ? (
          <Statistic
            value={record.unitPrice}
            prefix="¥"
            precision={2}
            valueStyle={{
              fontSize: 16,
              fontWeight: 600,
              color: "#cf1322",
              whiteSpace: "nowrap",
            }}
          />
        ) : (
          "-"
        ),
    },
    {
      title: "入库时间",
      key: "receivedAt",
      width: 110,
      render: (_, record) => {
        const text = formatDateTime(record.receivedAt);
        if (!text) return "-";
        const [date, ...rest] = text.split(" ");
        const time = rest.join(" ");
        return (
          <div style={{ lineHeight: 1.3 }}>
            <div>{date}</div>
            {time && <div style={{ color: "rgba(0,0,0,0.45)" }}>{time}</div>}
          </div>
        );
      },
    },
    {
      title: "采购单号",
      key: "purchaseOrderNo",
      width: 130,
      ellipsis: true,
      render: (_, record) =>
        record.purchaseOrderId ? (
          <Typography.Link
            onClick={() =>
              router.push(
                `/transaction/purchase-order?id=${record.purchaseOrderId}`,
              )
            }
          >
            {record.purchaseOrderNo ?? "-"}
          </Typography.Link>
        ) : (
          (record.purchaseOrderNo ?? "-")
        ),
    },
    {
      title: "销售单号",
      key: "saleOrderNos",
      width: 130,
      ellipsis: true,
      render: (_, record) => {
        const content = !record.saleOrderIds?.length
          ? record.saleOrderNos?.join(", ") || "-"
          : record.saleOrderNos?.map((no: string, idx: number) => (
              <span key={no}>
                {idx > 0 && ", "}
                <Typography.Link
                  onClick={() =>
                    router.push(
                      `/transaction/sale-order?id=${record.saleOrderIds![idx]}`,
                    )
                  }
                >
                  {no}
                </Typography.Link>
              </span>
            ));
        return (
          <span
            title={record.saleOrderNos?.join(", ")}
            style={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {content}
          </span>
        );
      },
    },
    { title: "储存点", dataIndex: "depotName", key: "depotName", width: 100, ellipsis: true },
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
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="库存雷达 / 出入库追踪"
        title="库存管理"
        description="按产品、仓点、序列号和库存单元追踪库存状态，让导出、打印和预警处理都更集中。"
        metrics={[
          { label: "当前记录", value: total },
          { label: "产品类别", value: categories.length },
          {
            label: "视图模式",
            value: viewMode === "inventories" ? "汇总" : "明细",
          },
        ]}
        actions={
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
        }
      />

      <div className="grid grid-cols-[260px_1fr] gap-4 max-lg:grid-cols-1">
        <div className="card af-side-card self-start">
          <div className="af-section-hint">打印/导出依据所选分类</div>
          <div className="af-section-label">产品类别</div>
          <CategoryTree
            categories={categories}
            selectedId={filters.productCategoryId}
            onSelect={(categoryId) =>
              updateFilter("productCategoryId", categoryId)
            }
          />
        </div>
        <div>
          <div className="card af-filter-card">
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
          <div className="card af-table-card">
            <div className="mb-3" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button type="primary" size="small" onClick={switchViewMode}>
                {viewMode === "inventories" ? "显示普通表格" : "显示内嵌表格"}
              </Button>
              {viewMode === "units" && (
                <Popover
                  trigger="click"
                  placement="bottomRight"
                  title="显示列"
                  content={
                    <Checkbox.Group
                      value={visibleUnitKeys}
                      onChange={(vals) => setVisibleUnitKeys(vals as string[])}
                      style={{ display: "flex", flexDirection: "column", gap: 6 }}
                    >
                      {unitColumnOptions.map((opt) => (
                        <Checkbox key={opt.value} value={opt.value}>
                          {opt.label}
                        </Checkbox>
                      ))}
                    </Checkbox.Group>
                  }
                >
                  <Button size="small" icon={<SettingOutlined />}>列设置</Button>
                </Popover>
              )}
            </div>
            {viewMode === "inventories" ? (
              <Table<BasicInventory>
                columns={inventoryColumns}
                dataSource={inventories}
                rowKey="id"
                loading={loading}
                size="middle"
                scroll={{ x: 1200 }}
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
                columns={unitColumns.filter(
                  (col) => col.key === "title" || visibleUnitKeys.includes(col.key as string),
                )}
                dataSource={inventoryUnits}
                rowKey="id"
                loading={loading}
                size="middle"
                scroll={{ x: 1500 }}
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
        <Form form={depotForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="depotId"
            label="选择储存点"
            rules={[{ required: true, message: "请选择储存点" }]}
          >
            <Select
              options={depotOptions}
              allowClear
              placeholder="请选择储存点"
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={showWarningModal}
        title="调整预警线"
        onCancel={() => setShowWarningModal(false)}
        onOk={handleUpdateWarning}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <Form form={warningForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="safetyStock"
            label="安全库存"
            rules={[{ required: true, message: "请输入安全库存" }]}
          >
            <InputNumber
              placeholder="请输入安全库存"
              style={{ width: "100%" }}
              min={0}
            />
          </Form.Item>
          <Form.Item
            name="maxStock"
            label="最大库存"
            rules={[{ required: true, message: "请输入最大库存" }]}
          >
            <InputNumber
              placeholder="请输入最大库存"
              style={{ width: "100%" }}
              min={0}
            />
          </Form.Item>
        </Form>
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
