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
  type Customer,
  type BasicCustomer,
} from "@abacusflow/core";
import { usePaginatedList } from "../../../../hooks/use-paginated-list";

export default function CustomersPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [editItem, setEditItem] = useState<BasicCustomer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<Customer | null>(null);
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
    BasicCustomer,
    { name?: string; phone?: string; address?: string }
  >({
    fetchFn: (params) =>
      partnerApi.listBasicCustomersPage(
        params as Parameters<typeof partnerApi.listBasicCustomersPage>[0],
      ),
    defaultFilters: { name: undefined, phone: undefined, address: undefined },
  });

  const openCreate = () => {
    setEditItem(null);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = (record: BasicCustomer) => {
    setEditItem(record);
    form.setFieldsValue({
      name: record.name,
      phone: record.phone ?? "",
      address: record.address ?? "",
    });
    setShowForm(true);
  };

  const openDetail = async (id: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await partnerApi.getCustomer({ id });
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
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.address ? { address: values.address } : {}),
      };
      if (editItem) {
        await partnerApi.updateCustomer({
          id: editItem.id,
          updateCustomerInput: payload,
        });
        message.success("编辑成功");
      } else {
        await partnerApi.addCustomer({ createCustomerInput: payload });
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
      content: "确定删除该客户？",
      onOk: async () => {
        try {
          await partnerApi.deleteCustomer({ id });
          message.success("删除成功");
          refresh();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "删除失败");
        }
      },
    });
  };

  const columns: ColumnsType<BasicCustomer> = [
    { title: "客户名称", dataIndex: "name", key: "name" },
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
        eyebrow="客户网络 / 需求侧资料"
        title="客户管理"
        description="统一维护客户名称、电话和地址，帮助销售出库与后续跟进保持清晰。"
        metrics={[
          { label: "客户总数", value: total },
          { label: "当前页", value: data.length },
        ]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增客户
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
            <label>客户名称</label>
            <Input
              value={filters.name ?? ""}
              onChange={(e) =>
                updateFilter("name", e.target.value || undefined)
              }
              placeholder="请输入客户名称"
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
            />
          </div>
          <Button type="primary" onClick={handleSearch}>
            搜索
          </Button>
          <Button onClick={handleReset}>重置</Button>
        </Flex>
      </div>

      <div className="card af-table-card">
        <Table<BasicCustomer>
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pageIndex,
            pageSize: 10,
            total,
            onChange: setPageIndex,
          }}
          size="middle"
        />
      </div>

      <Modal
        open={showForm}
        title={editItem ? "编辑客户" : "新增客户"}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <p style={{ color: "#999", textAlign: "center", padding: "2rem 0" }}>
            表单开发中...
          </p>
        </Form>
      </Modal>

      <Modal
        open={showDetail}
        title="客户详情"
        onCancel={() => setShowDetail(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        {detailLoading ? (
          <p style={{ color: "#999", textAlign: "center", padding: "2rem 0" }}>
            加载中...
          </p>
        ) : detailItem ? (
          <Descriptions column={1} size="small" labelStyle={{ width: 120 }}>
            <Descriptions.Item label="客户名称">
              {detailItem.name}
            </Descriptions.Item>
            <Descriptions.Item label="联系电话">
              {detailItem.phone ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="地址">
              {detailItem.address ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="历史订单数">
              {(detailItem as unknown as BasicCustomer).totalOrderCount ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="历史订单金额">
              {(
                detailItem as unknown as BasicCustomer
              ).totalOrderAmount?.toLocaleString("zh-CN") ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="最近交易日期">
              {(
                detailItem as unknown as BasicCustomer
              ).lastOrderDate?.toString() ?? "-"}
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
