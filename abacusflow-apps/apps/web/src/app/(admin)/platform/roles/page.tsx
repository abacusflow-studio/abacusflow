"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
} from "antd";
import { PlusOutlined, UserAddOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "@/components/admin-page-header";
import { usePermission } from "@/hooks/use-permission";
import {
  permissionApi,
  platformRoleApi,
  type Permission,
  type PlatformRole,
  type PlatformRoleAssignment,
} from "@abacusflow/core";

export default function PlatformRolesPage() {
  const { message } = App.useApp();
  const { can } = usePermission();
  const canManage = can("platform:role:manage");
  const [form] = Form.useForm();
  const [assignmentForm] = Form.useForm();
  const [roles, setRoles] = useState<PlatformRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [editing, setEditing] = useState<PlatformRole | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [assigning, setAssigning] = useState<PlatformRole | null>(null);
  const [assignments, setAssignments] = useState<PlatformRoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roleList, permissionList] = await Promise.all([
        platformRoleApi.listPlatformRoles(),
        permissionApi.listPermissions(),
      ]);
      setRoles(roleList);
      setPermissions(
        permissionList.filter((item) => item.scope === "PLATFORM"),
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "加载平台角色失败",
      );
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void load();
  }, [load]);

  const permissionOptions = useMemo(
    () =>
      permissions.map((item) => ({
        value: item.id,
        label: `${item.label} (${item.name})`,
      })),
    [permissions],
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = (role: PlatformRole) => {
    setEditing(role);
    form.setFieldsValue({
      name: role.name,
      label: role.label,
      permissionIds: role.permissionNames
        .map((name) => permissions.find((item) => item.name === name)?.id)
        .filter(Boolean),
    });
    setShowForm(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    const input = {
      name: values.name,
      label: values.label,
      permissionIds: values.permissionIds ?? [],
    };
    if (editing) {
      await platformRoleApi.updatePlatformRole({
        roleId: editing.id,
        platformRoleInput: input,
      });
    } else {
      await platformRoleApi.createPlatformRole({ platformRoleInput: input });
    }
    setShowForm(false);
    message.success(editing ? "平台角色已更新" : "平台角色已创建");
    await load();
  };

  const assign = async () => {
    if (!assigning) return;
    const { userId } = await assignmentForm.validateFields();
    await platformRoleApi.assignPlatformRole({ roleId: assigning.id, userId });
    setAssignments(
      await platformRoleApi.listPlatformRoleAssignments({
        roleId: assigning.id,
      }),
    );
    assignmentForm.resetFields();
    message.success("平台角色已分配");
  };

  const openAssignments = async (role: PlatformRole) => {
    setAssigning(role);
    assignmentForm.resetFields();
    setAssignments(
      await platformRoleApi.listPlatformRoleAssignments({ roleId: role.id }),
    );
  };

  const removeAssignment = async (assignment: PlatformRoleAssignment) => {
    if (!assigning) return;
    await platformRoleApi.removePlatformRole({
      roleId: assigning.id,
      userId: assignment.userId,
    });
    setAssignments(
      await platformRoleApi.listPlatformRoleAssignments({
        roleId: assigning.id,
      }),
    );
    message.success("平台角色分配已移除");
  };

  const columns: ColumnsType<PlatformRole> = [
    { title: "角色", dataIndex: "name", key: "name" },
    { title: "显示名称", dataIndex: "label", key: "label" },
    {
      title: "平台权限",
      key: "permissions",
      render: (_, item) => item.permissionNames.join(", ") || "-",
    },
    {
      title: "操作",
      key: "actions",
      render: (_, item) =>
        canManage ? (
          <Space>
            <Button type="link" onClick={() => openEdit(item)}>
              编辑
            </Button>
            <Button
              type="link"
              icon={<UserAddOutlined />}
              onClick={() => void openAssignments(item)}
            >
              用户分配
            </Button>
            <Popconfirm
              title="删除这个平台角色？"
              onConfirm={() =>
                platformRoleApi
                  .deletePlatformRole({ roleId: item.id })
                  .then(load)
              }
            >
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="平台中心 / 平台角色"
        title="平台角色"
        description="全局平台授权独立于任何租户成员关系。"
        metrics={[{ label: "角色数", value: roles.length }]}
        actions={
          canManage ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增平台角色
            </Button>
          ) : undefined
        }
      />
      <div className="card af-table-card">
        <Table
          columns={columns}
          dataSource={roles}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </div>
      <Modal
        open={showForm}
        title={editing ? "编辑平台角色" : "新增平台角色"}
        onCancel={() => setShowForm(false)}
        onOk={submit}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="角色标识" rules={[{ required: true }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item name="label" label="显示名称">
            <Input />
          </Form.Item>
          <Form.Item name="permissionIds" label="平台权限">
            <Select mode="multiple" options={permissionOptions} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={Boolean(assigning)}
        title={`${assigning?.label ?? ""} · 用户分配`}
        onCancel={() => setAssigning(null)}
        footer={null}
      >
        <Form form={assignmentForm} layout="vertical">
          <Space.Compact style={{ width: "100%" }}>
            <Form.Item
              name="userId"
              rules={[{ required: true }]}
              style={{ flex: 1, marginBottom: 16 }}
            >
              <InputNumber
                min={1}
                placeholder="用户 ID"
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Button type="primary" onClick={() => void assign()}>
              分配
            </Button>
          </Space.Compact>
        </Form>
        <Table
          size="small"
          rowKey="userId"
          pagination={false}
          dataSource={assignments}
          columns={[
            { title: "用户", dataIndex: "userName" },
            { title: "用户 ID", dataIndex: "userId" },
            {
              title: "操作",
              render: (_, assignment) =>
                canManage ? (
                  <Popconfirm
                    title="移除此平台角色分配？"
                    onConfirm={() => removeAssignment(assignment)}
                  >
                    <Button type="link" danger>
                      移除
                    </Button>
                  </Popconfirm>
                ) : null,
            },
          ]}
        />
      </Modal>
    </div>
  );
}
