"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  DataTable,
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
  Modal,
  PageHeader,
  type DataTableColumn,
} from "@abacusflow/ui";
import {
  productCategoryApi,
  type ProductCategory,
  type SelectableProductCategory,
} from "@abacusflow/core";
import { isNonEmpty } from "@abacusflow/utils";
import { useToast } from "../../../../hooks/use-toast";

interface CategoryForm {
  name: string;
  parentId: string;
  description: string;
}

interface CategoryRow extends SelectableProductCategory {
  depth: number;
}

const emptyForm: CategoryForm = {
  name: "",
  parentId: "",
  description: "",
};

export default function ProductCategoriesPage() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState<SelectableProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [editItem, setEditItem] = useState<ProductCategory | null>(null);
  const [parentContext, setParentContext] = useState<SelectableProductCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryForm, string>>>({});

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const list = await productCategoryApi.listSelectableCategories();
      setCategories(list);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载产品类别失败");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const rows = useMemo(() => flattenCategories(categories), [categories]);

  const filteredRows = useMemo(() => {
    const value = keyword.trim();
    if (!value) return rows;
    return rows.filter(
      (row) =>
        row.name.includes(value) ||
        (row.parentName?.includes(value) ?? false),
    );
  }, [keyword, rows]);

  const rootCategory = categories.find((category) => category.name === "根节点") ?? categories.find((category) => !category.parentId);

  const categoryOptions = categories
    .filter((category) => category.id !== editItem?.id)
    .map((category) => ({ label: category.name, value: category.id }));

  const openCreate = (parent?: SelectableProductCategory | null) => {
    const parentCategory = parent ?? rootCategory;
    setEditItem(null);
    setParentContext(parentCategory ?? null);
    setForm({
      name: "",
      parentId: parentCategory?.id.toString() ?? "",
      description: "",
    });
    setErrors({});
    setShowForm(true);
  };

  const openEdit = async (record: SelectableProductCategory) => {
    setShowForm(true);
    setFormLoading(true);
    setErrors({});
    try {
      const category = await productCategoryApi.getCategory(record.id);
      setEditItem(category);
      setParentContext(null);
      setForm({
        name: category.name,
        parentId: category.parentId?.toString() ?? "",
        description: category.description ?? "",
      });
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "加载产品类别失败");
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof CategoryForm, string>> = {};
    if (!isNonEmpty(form.name)) nextErrors.name = "请输入类别名";
    if (!form.parentId && !editItem) nextErrors.parentId = "请选择父类别";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        parentId: form.parentId ? Number(form.parentId) : undefined,
        description: form.description || undefined,
      };
      if (editItem) {
        await productCategoryApi.updateCategory({
          ...payload,
          id: editItem.id,
        });
        addToast("success", "编辑成功");
      } else {
        await productCategoryApi.createCategory({
          name: payload.name,
          parentId: Number(form.parentId),
          description: payload.description,
        });
        addToast("success", "新增成功");
      }
      setShowForm(false);
      loadCategories();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: SelectableProductCategory) => {
    if (record.name === "根节点") return;
    if (!confirm("确定删除该产品类别？")) return;
    try {
      await productCategoryApi.deleteCategory(record.id);
      addToast("success", "删除成功");
      loadCategories();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: DataTableColumn<CategoryRow>[] = [
    {
      key: "name",
      title: "类别名",
      render: (_, record) => (
        <span style={{ paddingLeft: record.depth * 18 }}>
          {record.depth > 0 ? "└ " : ""}
          {record.name}
        </span>
      ),
    },
    { key: "parentName", title: "父类别", dataIndex: "parentName" },
    {
      key: "action",
      title: "操作",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button type="link" label="新增" onClick={() => openCreate(record)} />
          <Button
            type="link"
            label="编辑"
            disabled={record.name === "根节点"}
            onClick={() => openEdit(record)}
          />
          <Button
            type="link"
            label="删除"
            disabled={record.name === "根节点"}
            onClick={() => handleDelete(record)}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="产品类别管理"
        extra={<Button type="primary" label="新增产品类别" onClick={() => openCreate()} disabled={!rootCategory} />}
      />
      <div className="card">
        <div className="form-inline mb-4">
          <div className="form-item">
            <label>类别名</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="请输入类别名"
            />
          </div>
          <Button type="primary" label="搜索" onClick={() => undefined} />
          <Button label="重置" onClick={() => setKeyword("")} />
        </div>
      </div>
      <div className="card">
        <DataTable columns={columns} data={filteredRows} rowKey="id" loading={loading} />
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑产品类别" : "新增产品类别"}
        onClose={() => setShowForm(false)}
        onOk={handleSubmit}
        okLoading={submitting}
        width={560}
      >
        {formLoading ? (
          <p className="text-gray-400 text-center py-8">加载中...</p>
        ) : (
          <>
            {parentContext && !editItem && (
              <div className="mb-3 text-sm text-gray-500">
                父类别：{parentContext.name}
              </div>
            )}
            <FormField label="类别名" required error={errors.name}>
              <FormInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="请输入类别名"
                error={!!errors.name}
              />
            </FormField>
            <FormField label="父类别" required={!editItem} error={errors.parentId}>
              <FormSelect
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                placeholder="请选择父类别"
                options={categoryOptions}
                error={!!errors.parentId}
              />
            </FormField>
            <FormField label="描述">
              <FormTextarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="请输入描述"
              />
            </FormField>
          </>
        )}
      </Modal>
    </div>
  );
}

function flattenCategories(categories: SelectableProductCategory[]): CategoryRow[] {
  const childrenByParent = new Map<number | undefined, SelectableProductCategory[]>();
  for (const category of categories) {
    const parentId = category.parentId ?? undefined;
    const list = childrenByParent.get(parentId) ?? [];
    list.push(category);
    childrenByParent.set(parentId, list);
  }

  const result: CategoryRow[] = [];
  const visit = (parentId: number | undefined, depth: number) => {
    const children = childrenByParent.get(parentId) ?? [];
    for (const child of children) {
      result.push({ ...child, depth });
      visit(child.id, depth + 1);
    }
  };

  visit(undefined, 0);
  return result;
}
