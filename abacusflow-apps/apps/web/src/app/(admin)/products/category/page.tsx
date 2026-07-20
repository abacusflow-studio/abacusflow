"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Select,
  Form,
  Flex,
  App,
  Space,
  Spin,
  Empty,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "../../../../components/admin-page-header";
import {
  productApi,
  type ProductCategory,
  type SelectableProductCategory,
} from "@abacusflow/core";
import {
  createParentIdFromForm,
  flattenProductCategories,
  TOP_LEVEL_PARENT_VALUE,
  updateParentIdFromForm,
  type ProductCategoryRow,
} from "../../../../lib/product-category-hierarchy";

type CategoryRow = ProductCategoryRow<SelectableProductCategory>;

export default function ProductCategoriesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [categories, setCategories] = useState<SelectableProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [editItem, setEditItem] = useState<ProductCategory | null>(null);
  // null = creating from virtual root (top-level), SelectableProductCategory = creating under that parent
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

  const rows = useMemo(
    () => flattenProductCategories(categories),
    [categories],
  );

  const filteredRows = useMemo(() => {
    const value = keyword.trim();
    if (!value) return rows;
    return rows.filter(
      (row) =>
        row.name.includes(value) || (row.parentName?.includes(value) ?? false),
    );
  }, [keyword, rows]);

  // Category options for the parent selector — only real categories, excluding self when editing
  const categoryOptions = categories
    .filter((category) => category.id !== editItem?.id)
    .map((category) => ({ label: category.name, value: category.id }));

  // Top-level option for moving a category to the top
  const parentOptions = [
    { label: "（顶级分类）", value: TOP_LEVEL_PARENT_VALUE },
    ...categoryOptions,
  ];

  const openCreate = (parent?: SelectableProductCategory | null) => {
    // parent=null means creating from virtual root → top-level category
    setEditItem(null);
    setParentContext(parent ?? null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      parentId: parent?.id ?? undefined,
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
        parentId: category.parentId ?? TOP_LEVEL_PARENT_VALUE,
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

      if (editItem) {
        // PUT: complete target state — name and parentId are both required
        const parentIdValue = updateParentIdFromForm(values.parentId);
        await productApi.updateProductCategory({
          id: editItem.id,
          updateProductCategoryInput: {
            name: values.name as string,
            parentId: parentIdValue,
            description: (values.description as string) || null,
          },
        });
        message.success("编辑成功");
      } else {
        // POST: parentId is optional — null/omitted = top-level
        const parentIdValue = createParentIdFromForm(values.parentId);
        await productApi.addProductCategory({
          createProductCategoryInput: {
            name: values.name as string,
            parentId: parentIdValue,
            description: (values.description as string) || null,
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
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openCreate(record)}>
            新增
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const isEmpty = categories.length === 0;

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="产品目录 / 类别树"
        title="产品类别管理"
        description="管理产品类别层级和父子关系，让产品目录结构更清晰，筛选更高效。"
        metrics={[
          { label: "类别总数", value: rows.length },
          { label: "当前显示", value: filteredRows.length },
        ]}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openCreate()}
          >
            新增产品类别
          </Button>
        }
      />

      <div className="card af-filter-card">
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

      <div className="card af-table-card">
        {isEmpty && !loading ? (
          <Empty
            description="暂无产品类别，请先创建顶级分类"
            style={{ padding: "48px 0" }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openCreate()}
            >
              创建顶级分类
            </Button>
          </Empty>
        ) : (
          <Table<CategoryRow>
            columns={columns}
            dataSource={filteredRows}
            rowKey="id"
            loading={loading}
            pagination={false}
            size="middle"
          />
        )}
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
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem 0",
            }}
          >
            <Spin />
          </div>
        ) : (
          <>
            {parentContext && !editItem && (
              <div style={{ marginBottom: 12, fontSize: 14, color: "#888" }}>
                父类别：{parentContext.name}
              </div>
            )}
            {!parentContext && !editItem && (
              <div style={{ marginBottom: 12, fontSize: 14, color: "#888" }}>
                父类别：全部分类（顶级分类）
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
                  editItem
                    ? [{ required: true, message: "请选择父类别" }]
                    : []
                }
              >
                {editItem ? (
                  <Select
                    options={parentOptions}
                    placeholder="请选择父类别"
                  />
                ) : (
                  <Select
                    options={categoryOptions}
                    placeholder="留空则创建顶级分类"
                    allowClear
                  />
                )}
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
