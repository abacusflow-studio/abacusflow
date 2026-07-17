"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Table,
  Modal,
  Form,
  App,
  Space,
  Tag,
  Select,
  Popconfirm,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "@/components/admin-page-header";
import {
  tenantApi,
  roleApi,
  userApi,
  type TenantMember,
  type Role,
  type BasicUser,
  type AddTenantMemberInput,
} from "@abacusflow/core";

function translateMemberStatus(value: string): string {
  if (value === "ACTIVE") return "正常";
  if (value === "SUSPENDED") return "已暂停";
  if (value === "PENDING_INVITATION") return "待接受";
  return value;
}

function memberStatusColor(value: string): string {
  if (value === "ACTIVE") return "success";
  if (value === "SUSPENDED") return "warning";
  if (value === "PENDING_INVITATION") return "processing";
  return "default";
}

export default function MemberManagementPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [members, setMembers] = useState<TenantMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allUsers, setAllUsers] = useState<BasicUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [editMember, setEditMember] = useState<TenantMember | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadMembers = useCallback(async () => {
    try {
      const data = await tenantApi.listTenantMembers();
      setMembers(data);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "加载成员列表失败");
    } finally {
      setLoading(false);
    }
  }, [message]);

  const loadRoles = useCallback(async () => {
    try {
      const data = await roleApi.listRoles();
      setRoles(data);
    } catch {
      // silent
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const data = await userApi.listBasicUsers();
      setAllUsers(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadMembers(), loadRoles(), loadAllUsers()]);
  }, [loadMembers, loadRoles, loadAllUsers]);

  // Non-member users for the "Add Member" selector
  const nonMemberUsers = useMemo(() => {
    const memberUserIds = new Set(members.map((m) => m.userId));
    return allUsers.filter((u) => !memberUserIds.has(u.id));
  }, [allUsers, members]);

  const roleOptions = roles.map((r) => ({
    label: r.label || r.name,
    value: r.id,
  }));

  const userOptions = nonMemberUsers.map((u) => ({
    label: `${u.name}${u.nick ? ` (${u.nick})` : ""}`,
    value: u.id,
  }));

  // ---- Add Member ----
  const openAddMember = () => {
    form.resetFields();
    setShowAddForm(true);
  };

  const handleAddMember = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const input: AddTenantMemberInput = {
        userId: values.userId,
        roleIds: values.roleIds || [],
      };
      await tenantApi.addTenantMember({ addTenantMemberInput: input });
      message.success("添加成员成功");
      setShowAddForm(false);
      await loadMembers();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Edit Roles ----
  const openEditRoles = (record: TenantMember) => {
    setEditMember(record);
    form.setFieldsValue({
      roleIds: roles
        .filter((r) => record.roleNames.includes(r.name))
        .map((r) => r.id),
    });
    setShowRoleForm(true);
  };

  const handleUpdateRoles = async () => {
    if (!editMember) return;
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      await tenantApi.updateMemberRoles({
        membershipId: editMember.id,
        updateMemberRolesInput: { roleIds: values.roleIds || [] },
      });
      message.success("角色更新成功");
      setShowRoleForm(false);
      await loadMembers();
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Remove Member ----
  const handleRemoveMember = async (record: TenantMember) => {
    try {
      await tenantApi.removeTenantMember({ membershipId: record.id });
      message.success("已移除成员");
      await loadMembers();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "移除失败");
    }
  };

  const columns: ColumnsType<TenantMember> = [
    {
      title: "用户名",
      dataIndex: "userName",
      key: "userName",
    },
    {
      title: "角色",
      key: "roleNames",
      render: (_, record) =>
        record.roleNames.length > 0
          ? record.roleNames.map((r) => <Tag key={r}>{r}</Tag>)
          : <Tag>无角色</Tag>,
    },
    {
      title: "状态",
      key: "status",
      width: 100,
      render: (_, record) => (
        <Tag color={memberStatusColor(record.status)}>
          {translateMemberStatus(record.status)}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => openEditRoles(record)}>
            编辑角色
          </Button>
          <Popconfirm
            title="确认移除"
            description={`确定要将「${record.userName}」从租户中移除吗？用户账号不会被删除。`}
            onConfirm={() => handleRemoveMember(record)}
            okText="移除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger>
              移除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="租户管理 / 成员"
        title="成员管理"
        description="管理当前租户的成员，添加已有用户为成员并分配角色。"
        metrics={[{ label: "成员总数", value: members.length }]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddMember}>
            添加成员
          </Button>
        }
      />

      <div className="card af-table-card">
        <Table<TenantMember>
          columns={columns}
          dataSource={members}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="middle"
        />
      </div>

      {/* Add Member Modal */}
      <Modal
        open={showAddForm}
        title="添加成员"
        onCancel={() => setShowAddForm(false)}
        onOk={handleAddMember}
        confirmLoading={submitting}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="userId"
            label="选择用户"
            rules={[{ required: true, message: "请选择要添加的用户" }]}
          >
            <Select
              showSearch
              placeholder="请选择用户"
              options={userOptions}
              optionFilterProp="label"
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item name="roleIds" label="初始角色">
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roleOptions}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Roles Modal */}
      <Modal
        open={showRoleForm}
        title={`编辑成员角色 — ${editMember?.userName ?? ""}`}
        onCancel={() => setShowRoleForm(false)}
        onOk={handleUpdateRoles}
        confirmLoading={submitting}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="roleIds" label="角色">
            <Select
              mode="multiple"
              placeholder="请选择角色"
              options={roleOptions}
              style={{ width: "100%" }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
