"use client";

import React, { useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Form,
  Flex,
  App,
  Space,
  Descriptions,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "../../../../components/admin-page-header";
import {
  partnerApi,
  type Supplier,
  type BasicSupplier,
} from "@abacusflow/core";
import { usePaginatedList } from "../../../../hooks/use-paginated-list";

export default function SuppliersPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [editItem, setEditItem] = useState<BasicSupplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Supplier | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    data,
    loading,
    pageIndex,
    total,
    filters,
    updateFilter,
    setPageIndex,
    refresh,
    handleSearch,
    handleReset,
  } = usePaginatedList<
    BasicSupplier,
    { name?: string; contactPerson?: string; phone?: string; address?: string }
  >({
    fetchFn: (params) =>
      partnerApi.listBasicSuppliersPage(
        params as Parameters<typeof partnerApi.listBasicSuppliersPage>[0],
      ),
    defaultFilters: {
      name: undefined,
      contactPerson: undefined,
      phone: undefined,
      address: undefined,
    },
  });

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = (record: BasicSupplier) => {
    setEditItem(record);
    form.setFieldsValue({
      name: record.name,
      contactPerson: record.contactPerson ?? "",
      phone: record.phone ?? "",
      address: record.address ?? "",
    });
    setShowForm(true);
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await partnerApi.getSupplier({ id });
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
        name: values.name,
        contactPerson: values.contactPerson || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
      };
      if (editItem) {
        await partnerApi.updateSupplier({
          id: editItem.id,
          updateSupplierInput: payload,
        });
        message.success("编辑成功");
      } else {
        await partnerApi.addSupplier({ createSupplierInput: payload });
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

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: "确认删除",
      content: "确定删除该供应商？",
      onOk: async () => {
        try {
          await partnerApi.deleteSupplier({ id });
          message.success("删除成功");
          refresh();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };

  const columns: ColumnsType<BasicSupplier> = [
    { title: "供应商名称", dataIndex: "name", key: "name" },
    { title: "联系人", dataIndex: "contactPerson", key: "contactPerson" },
    { title: "联系电话", dataIndex: "phone", key: "phone" },
    { title: "地址", dataIndex: "address", key: "address" },
    {
      title: "历史订单数",
      key: "totalOrderCount",
      render: (_, record) => record.totalOrderCount ?? "-",
    },
    {
      title: "历史订单金额",
      key: "totalOrderAmount",
      render: (_, record) =>
        record.totalOrderAmount?.toLocaleString("zh-CN") ?? "-",
    },
    { title: "最近交易日期", dataIndex: "lastOrderDate", key: "lastOrderDate" },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => openDetail(record.id)}
          >
            详情
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="供应网络 / 供给侧资料"
        title="供应商管理"
        description="沉淀供应商、联系人、电话和地址信息，让采购入库链路更稳定可追踪。"
        metrics={[
          { label: "供应商总数", value: total },
          { label: "当前页", value: data.length },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增供应商
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
            <label>供应商名称</label>
            <Input
              value={filters.name ?? ""}
              onChange={(e) =>
                updateFilter("name", e.target.value || undefined)
              }
              placeholder="请输入供应商名称"
              style={{ width: 200 }}
            />
          </div>
          <div className="form-item">
            <label>联系人</label>
            <Input
              value={filters.contactPerson ?? ""}
              onChange={(e) =>
                updateFilter("contactPerson", e.target.value || undefined)
              }
              placeholder="请输入联系人"
              style={{ width: 200 }}
            />
          </div>
          <div className="form-item">
            <label>电话</label>
            <Input
              value={filters.phone ?? ""}
              onChange={(e) =>
                updateFilter("phone", e.target.value || undefined)
              }
              placeholder="请输入电话"
              style={{ width: 200 }}
            />
          </div>
          <div className="form-item">
            <label>地址</label>
            <Input
              value={filters.address ?? ""}
              onChange={(e) =>
                updateFilter("address", e.target.value || undefined)
              }
              placeholder="请输入地址"
              style={{ width: 200 }}
            />
          </div>
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Flex>
      </div>

      <div className="card af-table-card">
        <Table<BasicSupplier>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pageIndex,
            pageSize: 10,
            total,
            onChange: setPageIndex,
            showTotal: (t) => `共 ${t} 条`,
            showSizeChanger: false,
          }}
          size="middle"
        />
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑供应商" : "新增供应商"}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="供应商名称"
            rules={[{ required: true, message: "请输入供应商名称" }]}
          >
            <Input placeholder="请输入供应商名称" />
          </Form.Item>
          <Form.Item name="contactPerson" label="联系人">
            <Input placeholder="请输入联系人" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="联系电话"
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: "请输入正确的手机号" },
            ]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: "email", message: "请输入正确的邮箱" }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="address" label="地址">
            <Input placeholder="请输入地址" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={showDetail}
        title="供应商详情"
        onCancel={() => setShowDetail(false)}
        footer={null}
        width={560}
        destroyOnHidden
      >
        {detailLoading ? (
          <p style={{ color: "#999", textAlign: "center", padding: "2rem 0" }}>
            加载中...
          </p>
        ) : detailItem ? (
          <Descriptions
            column={1}
            size="small"
            styles={{ label: { width: 120 } }}
          >
            <Descriptions.Item label="供应商名称">
              {detailItem.name}
            </Descriptions.Item>
            <Descriptions.Item label="联系人">
              {detailItem.contactPerson ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话">
              {detailItem.phone ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">
              {detailItem.email ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="地址">
              {detailItem.address ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="历史订单数">
              {(detailItem as unknown as BasicSupplier).totalOrderCount ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="历史订单金额">
              {(
                detailItem as unknown as BasicSupplier
              ).totalOrderAmount?.toLocaleString("zh-CN") ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {detailItem.createdAt ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {detailItem.updatedAt ?? "-"}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
}
