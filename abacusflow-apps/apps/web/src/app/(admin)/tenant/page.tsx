"use client";

import React, { useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Form,
  Tag,
  App,
  Space,
  Descriptions,
  Spin,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "@/components/admin-page-header";
import { useTenant } from "@/components/tenant-provider";
import {
  createTenant,
  getTenant,
  listTenants,
  updateTenant,
  type TenantDetail,
  type TenantInfo,
  type UpdateTenantInput,
} from "@abacusflow/core";

function translateTenantStatus(value?: string): string {
  if (value === "ACTIVE") return "正常";
  if (value === "SUSPENDED") return "已暂停";
  if (value === "DEPROVISIONED") return "已注销";
  return value ?? "-";
}

function tenantStatusColor(value?: string): string {
  if (value === "ACTIVE") return "success";
  if (value === "SUSPENDED") return "warning";
  if (value === "DEPROVISIONED") return "error";
  return "default";
}

function formatTimestamp(ts?: number | null): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("zh-CN");
}

export default function TenantManagementPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { tenants, currentTenantId, selectTenant, updateTenantInList, setBootstrapData } =
    useTenant();

  const [editItem, setEditItem] = useState<TenantDetail | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const refreshTenantList = async () => {
    try {
      const updatedTenants = await listTenants();
      setBootstrapData(
        updatedTenants.length > 1 ? "MULTI_TENANT" : "SINGLE_TENANT",
        updatedTenants,
      );
    } catch {
      // silent — list refresh is best-effort
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setIsCreateMode(true);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = async (record: TenantInfo) => {
    setIsCreateMode(false);
    setShowForm(true);
    setSubmitting(true);
    try {
      const detail = await getTenant(record.tenantId);
      setEditItem(detail);
      form.setFieldsValue({
        displayName: detail.displayName ?? "",
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载失败");
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (tenantId: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await getTenant(tenantId);
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

      if (isCreateMode) {
        await createTenant({
          name: values.name,
          displayName: values.displayName || undefined,
        });
        message.success("创建成功");
        setShowForm(false);
        await refreshTenantList();
      } else if (editItem) {
        const payload: UpdateTenantInput = {
          displayName: values.displayName || null,
        };
        const updated = await updateTenant(editItem.tenantId, payload);
        message.success("更新成功");
        setShowForm(false);
        updateTenantInList(editItem.tenantId, {
          displayName: updated.displayName ?? undefined,
        });
      }
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchTenant = (tenantId: number) => {
    selectTenant(tenantId);
  };

  const columns: ColumnsType<TenantInfo> = [
    {
      title: "租户名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "显示名称",
      key: "displayName",
      render: (_, record) => record.displayName || "-",
    },
    {
      title: "角色",
      key: "roleNames",
      render: (_, record) =>
        record.roleNames.length > 0
          ? record.roleNames.map((r) => <Tag key={r}>{r}</Tag>)
          : "-",
    },
    {
      title: "当前",
      key: "current",
      render: (_, record) =>
        record.tenantId === currentTenantId ? (
          <Tag color="success">当前</Tag>
        ) : null,
    },
    {
      title: "操作",
      key: "action",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => openDetail(record.tenantId)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => openEdit(record)}
          >
            编辑
          </Button>
          {record.tenantId !== currentTenantId && (
            <Button
              type="link"
              size="small"
              onClick={() => handleSwitchTenant(record.tenantId)}
            >
              切换
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="系统设置 / 租户"
        title="租户管理"
        description="查看和管理您所属的租户，包括租户信息、显示名称和租户切换。"
        metrics={[{ label: "租户总数", value: tenants.length }]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增租户
          </Button>
        }
      />

      <div className="card af-table-card">
        <Table<TenantInfo>
          columns={columns}
          dataSource={tenants}
          rowKey="tenantId"
          loading={false}
          pagination={false}
          size="middle"
        />
      </div>

      <Modal
        open={showForm}
        title={isCreateMode ? "新增租户" : "编辑租户"}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {isCreateMode ? (
            <Form.Item
              name="name"
              label="租户名称"
              rules={[{ required: true, message: "请输入租户名称" }]}
            >
              <Input placeholder="请输入租户名称（英文/数字，创建后不可修改）" />
            </Form.Item>
          ) : (
            <Form.Item label="租户名称（不可修改）">
              <Input value={editItem?.name} disabled />
            </Form.Item>
          )}
          <Form.Item name="displayName" label="显示名称">
            <Input placeholder="请输入显示名称" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={showDetail}
        title="租户详情"
        onCancel={() => setShowDetail(false)}
        footer={null}
        width={520}
        destroyOnHidden
      >
        {detailLoading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "2rem 0",
            }}
          >
            <Spin />
          </div>
        ) : detailItem ? (
          <Descriptions
            column={1}
            size="small"
            styles={{ label: { width: 100 } }}
          >
            <Descriptions.Item label="租户名称">
              {detailItem.name}
            </Descriptions.Item>
            <Descriptions.Item label="显示名称">
              {detailItem.displayName ?? "-"}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={tenantStatusColor(detailItem.status)}>
                {translateTenantStatus(detailItem.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              {detailItem.roleNames.length > 0
                ? detailItem.roleNames.map((r) => <Tag key={r}>{r}</Tag>)
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {formatTimestamp(detailItem.createdAt)}
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">
              {formatTimestamp(detailItem.updatedAt)}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </div>
  );
}
