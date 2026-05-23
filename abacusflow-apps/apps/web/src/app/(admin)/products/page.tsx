"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Select,
  Form,
  Typography,
  Flex,
  Tag,
  App,
  Space,
  Descriptions,
  Checkbox,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  productApi,
  type BasicProduct,
  type Product,
  type SelectableProductCategory,
} from "@abacusflow/core";
import {
  translateProductType,
  translateProductUnit,
  PRODUCT_TYPES,
  PRODUCT_UNITS,
  type ProductType,
  type ProductUnit,
} from "@abacusflow/utils";
import { usePaginatedList } from "../../../hooks/use-paginated-list";

const enabledOptions = [
  { label: "启用", value: "true" },
  { label: "禁用", value: "false" },
];

export default function ProductsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [editItem, setEditItem] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<SelectableProductCategory[]>([]);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Product | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    data, loading, pageIndex, total, filters,
    updateFilter, setPageIndex, refresh, handleSearch, handleReset,
  } = usePaginatedList<BasicProduct, {
    name?: string;
    type?: ProductType;
    enabled?: boolean;
    categoryId?: number;
  }>({
    fetchFn: (params) =>
      productApi.listBasicProductsPage(
        params as Parameters<typeof productApi.listBasicProductsPage>[0],
      ),
    defaultFilters: {
      name: undefined,
      type: undefined,
      enabled: undefined,
      categoryId: undefined,
    },
  });

  useEffect(() => {
    productApi
      .listSelectableProductCategories()
      .then(setCategories)
      .catch((err: unknown) => {
        console.error(err);
        message.error("加载产品类别失败");
      });
  }, [message]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.name, value: category.id })),
    [categories],
  );

  const productTypeOptions = useMemo(
    () => PRODUCT_TYPES.map((t) => ({ label: t.label, value: t.value })),
    [],
  );

  const productUnitOptions = useMemo(
    () => PRODUCT_UNITS.map((u) => ({ label: u.label, value: u.value })),
    [],
  );

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = async (record: BasicProduct) => {
    setFormLoading(true);
    setShowForm(true);
    try {
      const product = await productApi.getProduct({ id: record.id });
      setEditItem(product);
      form.setFieldsValue({
        name: product.name,
        specification: product.specification ?? "",
        type: product.type,
        categoryId: product.categoryId,
        barcode: product.barcode ?? "",
        unit: product.unit,
        note: product.note ?? "",
        enabled: product.enabled,
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载产品失败");
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await productApi.getProduct({ id });
      setDetailItem(item);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        name: values.name as string,
        specification: (values.specification as string) || undefined,
        type: values.type as ProductType,
        categoryId: values.categoryId as number,
        barcode: values.barcode as string,
        unit: values.unit as ProductUnit,
        note: (values.note as string) || undefined,
      };

      if (editItem) {
        await productApi.updateProduct({
          id: editItem.id,
          updateProductInput: { ...payload },
        });
        message.success("编辑成功");
      } else {
        await productApi.addProduct({ createProductInput: payload });
        message.success("新增成功");
      }
      setShowForm(false);
      refresh();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定删除该产品？",
      onOk: async () => {
        try {
          await productApi.deleteProduct({ id });
          message.success("删除成功");
          refresh();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };

  const resetAll = () => {
    handleReset();
    updateFilter("categoryId", undefined);
  };

  const columns: ColumnsType<BasicProduct> = [
    { title: "产品名称", dataIndex: "name", key: "name" },
    { title: "产品规格", dataIndex: "specification", key: "specification" },
    { title: "产品类别", dataIndex: "categoryName", key: "categoryName" },
    {
      title: "产品类型",
      key: "type",
      render: (_, record) => translateProductType(record.type),
    },
    { title: "条形码", dataIndex: "barcode", key: "barcode" },
    {
      title: "单位",
      key: "unit",
      render: (_, record) => translateProductUnit(record.unit),
    },
    {
      title: "启用状态",
      key: "enabled",
      render: (_, record) => (
        <Tag color={record.enabled ? "success" : "error"}>
          {record.enabled ? "启用" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openDetail(record.id)}>详情</Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>产品管理</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增产品</Button>
      </Flex>

      <div className="grid grid-cols-[260px_1fr] gap-4 max-lg:grid-cols-1">
        <div className="card self-start">
          <div className="text-sm font-semibold mb-3">产品类别</div>
          <CategoryTree
            categories={categories}
            selectedId={filters.categoryId}
            onSelect={(categoryId) => updateFilter("categoryId", categoryId)}
          />
        </div>
        <div>
          <div className="card">
            <div className="form-inline mb-4">
              <div className="form-item">
                <label>产品名称</label>
                <Input
                  value={filters.name ?? ""}
                  onChange={(e) => updateFilter("name", e.target.value || undefined)}
                  placeholder="请输入产品名称"
                />
              </div>
              <div className="form-item">
                <label>类型</label>
                <Select
                  value={filters.type ?? undefined}
                  onChange={(value) => updateFilter("type", value as ProductType | undefined)}
                  options={productTypeOptions}
                  allowClear
                  placeholder="全部"
                  style={{ width: "100%" }}
                />
              </div>
              <div className="form-item">
                <label>启用状态</label>
                <Select
                  value={filters.enabled === undefined ? undefined : String(filters.enabled)}
                  onChange={(value) => updateFilter("enabled", value ? value === "true" : undefined)}
                  options={enabledOptions}
                  allowClear
                  placeholder="全部"
                  style={{ width: "100%" }}
                />
              </div>
              <Button type="primary" onClick={handleSearch}>搜索</Button>
              <Button onClick={resetAll}>重置</Button>
            </div>
          </div>
          <div className="card">
            <Table<BasicProduct>
              columns={columns}
              dataSource={data}
              rowKey="id"
              loading={loading}
              size="middle"
              pagination={{
                current: pageIndex,
                pageSize: 10,
                total,
                onChange: setPageIndex,
                showTotal: (t) => `共 ${t} 条`,
                showSizeChanger: false,
              }}
            />
          </div>
        </div>
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑产品" : "新增产品"}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={640}
        destroyOnHidden
      >
        {formLoading ? (
          <p style={{ color: "#999", textAlign: "center", padding: "2rem 0" }}>加载中...</p>
        ) : (
          <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
            <Form.Item
              name="name"
              label="产品名称"
              rules={[{ required: true, message: "请输入产品名称" }]}
            >
              <Input placeholder="请输入产品名称" />
            </Form.Item>
            <Form.Item name="specification" label="产品规格">
              <Input placeholder="请输入产品规格" />
            </Form.Item>
            <Form.Item
              name="type"
              label="产品类型"
              rules={[{ required: true, message: "请选择产品类型" }]}
            >
              <Select options={productTypeOptions} placeholder="请选择产品类型" />
            </Form.Item>
            <Form.Item
              name="categoryId"
              label="产品类别"
              rules={[{ required: true, message: "请选择产品类别" }]}
            >
              <Select options={categoryOptions} placeholder="请选择产品类别" />
            </Form.Item>
            <Form.Item
              name="barcode"
              label="条形码"
              rules={[{ required: true, message: "请输入条形码" }]}
            >
              <Input placeholder="请输入条形码" />
            </Form.Item>
            <Form.Item
              name="unit"
              label="单位"
              rules={[{ required: true, message: "请选择单位" }]}
            >
              <Select options={productUnitOptions} placeholder="请选择单位" />
            </Form.Item>
            <Form.Item name="note" label="备注">
              <Input.TextArea placeholder="请输入备注" rows={3} />
            </Form.Item>
            {editItem && (
              <Form.Item name="enabled" label="启用状态" valuePropName="checked">
                <Checkbox>启用</Checkbox>
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>

      <Modal
        open={showDetail}
        title="产品详情"
        onCancel={() => setShowDetail(false)}
        footer={null}
        width={600}
        destroyOnHidden
      >
        {detailLoading ? (
          <p style={{ color: "#999", textAlign: "center", padding: "2rem 0" }}>加载中...</p>
        ) : detailItem ? (
          <Descriptions column={1} size="small" labelStyle={{ width: 100 }}>
            <Descriptions.Item label="产品名称">{detailItem.name}</Descriptions.Item>
            <Descriptions.Item label="产品规格">{detailItem.specification ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="产品类型">{translateProductType(detailItem.type)}</Descriptions.Item>
            <Descriptions.Item label="产品类别">{detailItem.categoryId ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="条形码">{detailItem.barcode ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="单位">{translateProductUnit(detailItem.unit)}</Descriptions.Item>
            <Descriptions.Item label="启用状态">
              <Tag color={detailItem.enabled ? "success" : "error"}>
                {detailItem.enabled ? "启用" : "禁用"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="备注">{detailItem.note ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{detailItem.createdAt ?? "-"}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{detailItem.updatedAt ?? "-"}</Descriptions.Item>
          </Descriptions>
        ) : null}
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
