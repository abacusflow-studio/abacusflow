"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  PageHeader, Button, DataTable, Modal,
  FormField, FormInput, FormSelect, FormTextarea,
  type DataTableColumn,
} from "@abacusflow/ui";
import {
  productApi,
  productCategoryApi,
  type BasicProduct,
  type Product,
  type SelectableProductCategory,
} from "@abacusflow/core";
import {
  translateProductType, translateProductUnit, isNonEmpty,
  PRODUCT_TYPES, PRODUCT_UNITS,
  type ProductType, type ProductUnit,
} from "@abacusflow/utils";
import { usePaginatedList } from "../../../hooks/use-paginated-list";
import { useToast } from "../../../hooks/use-toast";

interface ProductForm {
  name: string;
  specification: string;
  type: ProductType;
  categoryId: string;
  barcode: string;
  unit: ProductUnit;
  note: string;
  enabled: boolean;
}

const emptyForm: ProductForm = {
  name: "",
  specification: "",
  type: "material",
  categoryId: "",
  barcode: "",
  unit: "piece",
  note: "",
  enabled: true,
};

const enabledOptions = [
  { label: "启用", value: "true" },
  { label: "禁用", value: "false" },
];

export default function ProductsPage() {
  const { addToast } = useToast();
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});
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
    productCategoryApi
      .listSelectableCategories()
      .then(setCategories)
      .catch((err) => {
        console.error(err);
        addToast("error", "加载产品类别失败");
      });
  }, [addToast]);

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ label: category.name, value: category.id })),
    [categories],
  );

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setErrors({});
    setShowForm(true);
  };

  const openEdit = async (record: BasicProduct) => {
    setFormLoading(true);
    setShowForm(true);
    setErrors({});
    try {
      const product = await productApi.getProduct(record.id);
      setEditItem(product);
      setForm({
        name: product.name,
        specification: product.specification ?? "",
        type: product.type,
        categoryId: product.categoryId?.toString() ?? "",
        barcode: product.barcode ?? "",
        unit: product.unit,
        note: product.note ?? "",
        enabled: product.enabled,
      });
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载产品失败");
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await productApi.getProduct(id);
      setDetailItem(item);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载失败");
      setShowDetail(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProductForm, string>> = {};
    if (!isNonEmpty(form.name)) newErrors.name = "请输入产品名称";
    if (!form.categoryId) newErrors.categoryId = "请选择产品类别";
    if (!isNonEmpty(form.barcode)) newErrors.barcode = "请输入条形码";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        specification: form.specification || undefined,
        type: form.type,
        categoryId: Number(form.categoryId),
        barcode: form.barcode,
        unit: form.unit,
        note: form.note || undefined,
      };

      if (editItem) {
        await productApi.updateProduct({
          ...payload,
          id: editItem.id,
          enabled: form.enabled,
        });
        addToast("success", "编辑成功");
      } else {
        await productApi.createProduct(payload);
        addToast("success", "新增成功");
      }
      setShowForm(false);
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该产品？")) return;
    try {
      await productApi.deleteProduct(id);
      addToast("success", "删除成功");
      refresh();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  const resetAll = () => {
    handleReset();
    updateFilter("categoryId", undefined);
  };

  const columns: DataTableColumn<BasicProduct>[] = [
    { key: "name", title: "产品名称", dataIndex: "name" },
    { key: "specification", title: "产品规格", dataIndex: "specification" },
    { key: "categoryName", title: "产品类别", dataIndex: "categoryName" },
    {
      key: "type",
      title: "产品类型",
      render: (_, record) => translateProductType(record.type),
    },
    { key: "barcode", title: "条形码", dataIndex: "barcode" },
    {
      key: "unit",
      title: "单位",
      render: (_, record) => translateProductUnit(record.unit),
    },
    {
      key: "enabled",
      title: "启用状态",
      render: (_, record) => (
        <span className={record.enabled ? "text-green-500" : "text-red-500"}>
          {record.enabled ? "启用" : "禁用"}
        </span>
      ),
    },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="link" label="详情" onClick={() => openDetail(record.id)} />
          <Button type="link" label="编辑" onClick={() => openEdit(record)} />
          <Button type="link" label="删除" onClick={() => handleDelete(record.id)} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="产品管理"
        extra={<Button type="primary" label="新增产品" onClick={openCreate} />}
      />
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
                <input
                  value={filters.name ?? ""}
                  onChange={(e) => updateFilter("name", e.target.value || undefined)}
                  placeholder="请输入产品名称"
                />
              </div>
              <div className="form-item">
                <label>类型</label>
                <select
                  value={filters.type ?? ""}
                  onChange={(e) => updateFilter("type", (e.target.value || undefined) as ProductType | undefined)}
                >
                  <option value="">全部</option>
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-item">
                <label>启用状态</label>
                <select
                  value={filters.enabled === undefined ? "" : String(filters.enabled)}
                  onChange={(e) => updateFilter("enabled", e.target.value ? e.target.value === "true" : undefined)}
                >
                  <option value="">全部</option>
                  {enabledOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <Button type="primary" label="搜索" onClick={handleSearch} />
              <Button label="重置" onClick={resetAll} />
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
        </div>
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑产品" : "新增产品"}
        onClose={() => setShowForm(false)}
        onOk={handleSubmit}
        okLoading={submitting}
        width={640}
      >
        {formLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : (
          <>
            <FormField label="产品名称" required error={errors.name}>
              <FormInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入产品名称"
                error={!!errors.name}
              />
            </FormField>
            <FormField label="产品规格">
              <FormInput
                value={form.specification}
                onChange={(e) => setForm({ ...form, specification: e.target.value })}
                placeholder="请输入产品规格"
              />
            </FormField>
            <FormField label="产品类型" required>
              <FormSelect
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ProductType })}
                options={PRODUCT_TYPES}
              />
            </FormField>
            <FormField label="产品类别" required error={errors.categoryId}>
              <FormSelect
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                options={categoryOptions}
                placeholder="请选择产品类别"
                error={!!errors.categoryId}
              />
            </FormField>
            <FormField label="条形码" required error={errors.barcode}>
              <FormInput
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                placeholder="请输入条形码"
                error={!!errors.barcode}
              />
            </FormField>
            <FormField label="单位" required>
              <FormSelect
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value as ProductUnit })}
                options={PRODUCT_UNITS}
              />
            </FormField>
            <FormField label="备注">
              <FormTextarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="请输入备注"
              />
            </FormField>
            {editItem && (
              <FormField label="启用状态">
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  />
                  <span>{form.enabled ? "启用" : "禁用"}</span>
                </label>
              </FormField>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={showDetail}
        title="产品详情"
        onClose={() => setShowDetail(false)}
        width={600}
      >
        {detailLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : detailItem ? (
          <div className="flex flex-col gap-3">
            <DetailRow label="产品名称" value={detailItem.name} />
            <DetailRow label="产品规格" value={detailItem.specification} />
            <DetailRow label="产品类型" value={translateProductType(detailItem.type)} />
            <DetailRow label="产品类别" value={detailItem.categoryName ?? detailItem.categoryId} />
            <DetailRow label="条形码" value={detailItem.barcode} />
            <DetailRow label="单位" value={translateProductUnit(detailItem.unit)} />
            <DetailRow label="启用状态" value={detailItem.enabled ? "启用" : "禁用"} />
            <DetailRow label="备注" value={detailItem.note} />
            <DetailRow label="创建时间" value={detailItem.createdAt} />
            <DetailRow label="更新时间" value={detailItem.updatedAt} />
          </div>
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

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <span style={{ color: "#999", minWidth: 80, flexShrink: 0 }}>{label}：</span>
      <span>{value ?? "-"}</span>
    </div>
  );
}
