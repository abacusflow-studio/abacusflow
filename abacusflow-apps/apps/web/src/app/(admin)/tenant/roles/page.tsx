"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Table,
  Modal,
  Input,
  Form,
  Tag,
  App,
  Space,
  Select,
  Popconfirm,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "@/components/admin-page-header";
import {
  roleApi,
  permissionApi,
  type Role,
  type Permission,
  type CreateRoleInput,
  type UpdateRoleInput,
} from "@abacusflow/core";

export default function RoleManagementPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const [editItem, setEditItem] = useState<Role | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadRoles = useCallback(async () => {
    try {
      const data = await roleApi.listRoles();
      setRoles(data);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载角色列表失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  const loadPermissions = useCallback(async () => {
    try {
      const data = await permissionApi.listPermissions();
      setPermissions(data);
    } catch {
      // silent — permissions are best-effort
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadRoles(), loadPermissions()]);
  }, [loadRoles, loadPermissions]);

  const openCreate = () => {
    setEditItem(null);
    setIsCreateMode(true);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = (record: Role) => {
    setEditItem(record);
    setIsCreateMode(false);
    form.setFieldsValue({
      label: record.label,
      permissionIds: record.permissionNames
        .map((name) => permissions.find((p) => p.name === name)?.id)
        .filter((id): id is number => id !== undefined),
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (isCreateMode) {
        const input: CreateRoleInput = {
          name: values.name,
          label: values.label || undefined,
          permissionIds: values.permissionIds || [],
        };
        await roleApi.createRole({ createRoleInput: input });
        message.success("创建成功");
      } else if (editItem) {
        const input: UpdateRoleInput = {
          label: values.label || undefined,
          permissionIds: values.permissionIds || [],
        };
        await roleApi.updateRole({ roleId: editItem.id, updateRoleInput: input });
        message.success("更新成功");
      }

      setShowForm(false);
      await loadRoles();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (roleId: number) => {
    try {
      await roleApi.deleteRole({ roleId });
      message.success("删除成功");
      await loadRoles();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  // Group permissions by domain for better UX
  const permissionOptions = permissions.map((p) => ({
    label: `${p.label} (${p.name})`,
    value: p.id,
  }));

  const columns: ColumnsType<Role> = [
    {
      title: "角色名称",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "显示名称",
      dataIndex: "label",
      key: "label",
    },
    {
      title: "权限数量",
      key: "permissionCount",
      width: 100,
      render: (_, record) => record.permissionNames.length,
    },
    {
      title: "操作",
      key: "action",
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description={`确定要删除角色「${record.label || record.name}」吗？`}
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
        eyebrow="租户管理 / 角色"
        title="角色管理"
        description="管理当前租户的角色定义和权限分配。"
        metrics={[{ label: "角色总数", value: roles.length }]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增角色
          </Button>
        }
      />

      <div className="card af-table-card">
        <Table<Role>
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </div>

      <Modal
        open={showForm}
        title={isCreateMode ? "新增角色" : "编辑角色"}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {isCreateMode ? (
            <Form.Item
              name="name"
              label="角色名称"
              rules={[{ required: true, message: "请输入角色名称" }]}
            >
              <Input placeholder="请输入角色名称（英文/数字/下划线/冒号，创建后不可修改）" />
            </Form.Item>
          ) : (
            <Form.Item label="角色名称（不可修改）">
              <Input value={editItem?.name} disabled />
            </Form.Item>
          )}
          <Form.Item name="label" label="显示名称">
            <Input placeholder="请输入显示名称" />
          </Form.Item>
          <Form.Item name="permissionIds" label="权限">
            <Select
              mode="multiple"
              placeholder="请选择权限"
              options={permissionOptions}
              optionFilterProp="label"
              showSearch
              maxTagCount={5}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
