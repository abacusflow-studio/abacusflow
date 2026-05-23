"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Select,
  Form,
  Typography,
  Flex,
  App,
  Space,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  productApi,
  type ProductCategory,
  type SelectableProductCategory,
} from "@abacusflow/core";

interface CategoryRow extends SelectableProductCategory {
  depth: number;
}

export default function ProductCategoriesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [categories, setCategories] = useState<SelectableProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [editItem, setEditItem] = useState<ProductCategory | null>(null);
  const [parentContext, setParentContext] =
    useState<SelectableProductCategory | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const list = await productApi.listSelectableProductCategories();
      setCategories(list);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载产品类别失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const rows = useMemo(() => flattenCategories(categories), [categories]);

  const filteredRows = useMemo(() => {
    const value = keyword.trim();
    if (!value) return rows;
    return rows.filter(
      (row) =>
        row.name.includes(value) || (row.parentName?.includes(value) ?? false),
    );
  }, [keyword, rows]);

  const rootCategory =
    categories.find((category) => category.name === "根节点") ??
    categories.find((category) => !category.parentId);

  const categoryOptions = categories
    .filter((category) => category.id !== editItem?.id)
    .map((category) => ({ label: category.name, value: category.id }));

  const openCreate = (parent?: SelectableProductCategory | null) => {
    const parentCategory = parent ?? rootCategory;
    setEditItem(null);
    setParentContext(parentCategory ?? null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      parentId: parentCategory?.id,
      description: "",
    });
    setShowForm(true);
  };

  const openEdit = async (record: SelectableProductCategory) => {
    setShowForm(true);
    setFormLoading(true);
    try {
      const category = await productApi.getProductCategory({ id: record.id });
      setEditItem(category);
      setParentContext(null);
      form.setFieldsValue({
        name: category.name,
        parentId: category.parentId,
        description: category.description ?? "",
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载产品类别失败");
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload = {
        name: values.name as string,
        ...(values.parentId != null
          ? { parentId: values.parentId as number }
          : {}),
        ...(values.description
          ? { description: values.description as string }
          : {}),
      };
      if (editItem) {
        await productApi.updateProductCategory({
          id: editItem.id,
          updateProductCategoryInput: payload,
        });
        message.success("编辑成功");
      } else {
        await productApi.addProductCategory({
          createProductCategoryInput: {
            ...payload,
            parentId: values.parentId as number,
          },
        });
        message.success("新增成功");
      }
      setShowForm(false);
      loadCategories();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: SelectableProductCategory) => {
    if (record.name === "根节点") return;
    Modal.confirm({
      title: "确认删除",
      content: "确定删除该产品类别？",
      onOk: async () => {
        try {
          await productApi.deleteProductCategory({ id: record.id });
          message.success("删除成功");
          loadCategories();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };

  const columns: ColumnsType<CategoryRow> = [
    {
      title: "类别名",
      key: "name",
      render: (_, record) => (
        <span style={{ paddingLeft: record.depth * 18 }}>
          {record.depth > 0 ? "└ " : ""}
          {record.name}
        </span>
      ),
    },
    { title: "父类别", dataIndex: "parentName", key: "parentName" },
    {
      title: "操作",
      key: "action",
      render: (_, record) => {
        const isRoot = record.name === "根节点";
        return (
          <Space size="small">
            <Button type="link" size="small" onClick={() => openCreate(record)}>
              新增
            </Button>
            <Button
              type="link"
              size="small"
              disabled={isRoot}
              onClick={() => openEdit(record)}
            >
              编辑
            </Button>
            <Button
              type="link"
              size="small"
              danger
              disabled={isRoot}
              onClick={() => handleDelete(record)}
            >
              删除
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          产品类别管理
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => openCreate()}
          disabled={!rootCategory}
        >
          新增产品类别
        </Button>
      </Flex>

      <div className="card">
        <Flex
          wrap="wrap"
          gap={12}
          align="flex-end"
          style={{ marginBottom: 16 }}
        >
          <div className="form-item">
            <label>类别名</label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="请输入类别名"
              style={{ width: 200 }}
            />
          </div>
          <Button type="primary" onClick={() => undefined}>
            搜索
          </Button>
          <Button onClick={() => setKeyword("")}>重置</Button>
        </Flex>
      </div>

      <div className="card">
        <Table<CategoryRow>
          columns={columns}
          dataSource={filteredRows}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑产品类别" : "新增产品类别"}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={560}
        destroyOnHidden
      >
        {formLoading ? (
          <p style={{ color: "#999", textAlign: "center", padding: "2rem 0" }}>
            加载中...
          </p>
        ) : (
          <>
            {parentContext && !editItem && (
              <div style={{ marginBottom: 12, fontSize: 14, color: "#888" }}>
                父类别：{parentContext.name}
              </div>
            )}
            <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
              <Form.Item
                name="name"
                label="类别名"
                rules={[{ required: true, message: "请输入类别名" }]}
              >
                <Input placeholder="请输入类别名" />
              </Form.Item>
              <Form.Item
                name="parentId"
                label="父类别"
                rules={
                  editItem ? [] : [{ required: true, message: "请选择父类别" }]
                }
              >
                <Select
                  options={categoryOptions}
                  placeholder="请选择父类别"
                  allowClear
                />
              </Form.Item>
              <Form.Item name="description" label="描述">
                <Input.TextArea placeholder="请输入描述" rows={3} />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}

function flattenCategories(
  categories: SelectableProductCategory[],
): CategoryRow[] {
  const childrenByParent = new Map<
    number | undefined,
    SelectableProductCategory[]
  >();
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
