"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Form,
  App,
  Space,
  Popconfirm,
  Tag,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "@/components/admin-page-header";
import {
  permissionApi,
  type Permission,
  type CreatePermissionInput,
  type UpdatePermissionInput,
} from "@abacusflow/core";

export default function PermissionManagementPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [editItem, setEditItem] = useState<Permission | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
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

  const openCreate = () => {
    setEditItem(null);
    setIsCreateMode(true);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = (record: Permission) => {
    setEditItem(record);
    setIsCreateMode(false);
    form.setFieldsValue({
      label: record.label,
      description: record.description,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (isCreateMode) {
        const input: CreatePermissionInput = {
          name: values.name,
          label: values.label || values.name,
          description: values.description || "",
        };
        await permissionApi.createPermission({ createPermissionInput: input });
        message.success("创建成功");
      } else if (editItem) {
        const input: UpdatePermissionInput = {
          label: values.label || undefined,
          description: values.description || undefined,
        };
        await permissionApi.updatePermission({
          permissionId: editItem.id,
          updatePermissionInput: input,
        });
        message.success("更新成功");
      }

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

  const handleDelete = async (permissionId: number) => {
    try {
      await permissionApi.deletePermission({ permissionId });
      message.success("删除成功");
      await loadPermissions();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: ColumnsType<Permission> = [
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
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除权限「${record.label || record.name}」吗？如果该权限被角色使用则无法删除。`}
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="平台管理 / 权限"
        title="权限管理"
        description="管理系统权限定义，权限可分配给角色使用。"
        metrics={[{ label: "权限总数", value: permissions.length }]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增权限
          </Button>
        }
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
        title={isCreateMode ? "新增权限" : "编辑权限"}
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
              label="权限标识"
              rules={[
                { required: true, message: "请输入权限标识" },
                {
                  pattern: /^[a-zA-Z][a-zA-Z0-9:_-]*$/,
                  message: "权限标识需以字母开头，仅支持字母、数字、冒号、下划线、连字符",
                },
              ]}
              extra="权限标识创建后不可修改，建议使用 domain:action 格式，如 inventory:read"
            >
              <Input placeholder="如 inventory:read" />
            </Form.Item>
          ) : (
            <Form.Item label="权限标识（不可修改）">
              <Input value={editItem?.name} disabled />
            </Form.Item>
          )}
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
