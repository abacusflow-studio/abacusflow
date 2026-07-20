"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Form,
  App,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "@/components/admin-page-header";
import { usePermission } from "@/hooks/use-permission";
import {
  permissionApi,
  type Permission,
  type UpdatePermissionInput,
} from "@abacusflow/core";

const scopeLabelMap: Record<string, string> = {
  PLATFORM: "平台",
  TENANT: "租户",
  BUSINESS: "业务",
};

export default function PermissionManagementPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { can } = usePermission();
  const canManage = can("platform:permission:manage");

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [editItem, setEditItem] = useState<Permission | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadPermissions = useCallback(async () => {
    try {
      const data = await permissionApi.listPermissions();
      setPermissions(data);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载权限列表失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  const openEdit = (record: Permission) => {
    setEditItem(record);
    form.setFieldsValue({
      label: record.label,
      description: record.description,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!editItem) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const input: UpdatePermissionInput = {
        label: values.label || undefined,
        description: values.description || undefined,
      };
      await permissionApi.updatePermission({
        permissionId: editItem.id,
        updatePermissionInput: input,
      });
      message.success("更新成功");

      setShowForm(false);
      await loadPermissions();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<Permission> = [
    {
      title: "范围",
      dataIndex: "scope",
      key: "scope",
      width: 110,
      render: (scope: string) => <Tag>{scopeLabelMap[scope] ?? scope}</Tag>,
    },
    {
      title: "权限标识",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: "显示名称",
      dataIndex: "label",
      key: "label",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      render: (_, record) => canManage ? (
        <Button type="link" size="small" onClick={() => openEdit(record)}>
          编辑
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="平台管理 / 权限"
        title="权限目录"
        description="系统权限定义目录。权限名称为后端部署契约，不可在运行时创建或删除；仅可编辑显示名称和描述。"
        metrics={[{ label: "权限总数", value: permissions.length }]}
      />

      <div className="card af-table-card">
        <Table<Permission>
          columns={columns}
          dataSource={permissions}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </div>

      <Modal
        open={showForm}
        title="编辑权限元数据"
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="权限标识（部署契约，不可修改）">
            <Input value={editItem?.name} disabled />
          </Form.Item>
          <Form.Item label="范围（不可修改）">
            <Input value={editItem ? (scopeLabelMap[editItem.scope] ?? editItem.scope) : ""} disabled />
          </Form.Item>
          <Form.Item
            name="label"
            label="显示名称"
            rules={[{ required: true, message: "请输入显示名称" }]}
          >
            <Input placeholder="请输入显示名称" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入权限描述" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
