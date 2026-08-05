"use client";

import React, { useCallback, useEffect, useState } from "react";
import { App, Button, Form, Input, Modal, Space, Table, Tag } from "antd";
import { CopyOutlined, PlusOutlined, RedoOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { AdminPageHeader } from "@/components/admin-page-header";
import { usePermission } from "@/hooks/use-permission";
import {
  tenantApi,
  type PlatformTenant,
  type UpdateTenantInput,
} from "@abacusflow/core";
import { TenantForm } from "./TenantForm";
import { tenantStatusColor, translateTenantStatus } from "./utils";

export function TenantTable() {
  const { message } = App.useApp();
  const { can } = usePermission();
  const [form] = Form.useForm();
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<PlatformTenant | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deliveryToken, setDeliveryToken] = useState<string | null>(null);
  const [reissueItem, setReissueItem] = useState<PlatformTenant | null>(null);
  const [reissueEmail, setReissueEmail] = useState("");

  const canCreate = can("platform:tenant:create");
  const canUpdate = can("platform:tenant:update");

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      setTenants(await tenantApi.listPlatformTenants());
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "加载平台租户目录失败",
      );
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  const openCreate = () => {
    setEditItem(null);
    setIsCreateMode(true);
    form.resetFields();
    setShowForm(true);
  };

  const openEdit = (record: PlatformTenant) => {
    setEditItem(record);
    setIsCreateMode(false);
    form.setFieldsValue({ displayName: record.displayName ?? "" });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (isCreateMode) {
        const result = await tenantApi.provisionTenant({
          createTenantInput: {
            name: values.name,
            displayName: values.displayName || undefined,
            initialAdministratorEmail: values.initialAdministratorEmail,
          },
        });
        setDeliveryToken(result.initialInvitation.token ?? null);
        message.success("租户已创建，等待首位管理员接受邀请");
      } else if (editItem) {
        const input: UpdateTenantInput = {
          displayName: values.displayName || null,
        };
        await tenantApi.updatePlatformTenant({
          tenantId: editItem.id,
          updateTenantInput: input,
        });
        message.success("租户资料已更新");
      }
      setShowForm(false);
      await loadTenants();
    } catch (error) {
      if (error instanceof Error) message.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReissue = async () => {
    if (!reissueItem) return;
    try {
      setSubmitting(true);
      const invitation = await tenantApi.reissueInitialTenantInvitation({
        tenantId: reissueItem.id,
        reissueInitialInvitationInput: { email: reissueEmail },
      });
      setReissueItem(null);
      setDeliveryToken(invitation.token ?? null);
      message.success("初始管理员邀请已重新签发");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "重新签发失败");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<PlatformTenant> = [
    { title: "租户名称", dataIndex: "name", key: "name" },
    {
      title: "显示名称",
      key: "displayName",
      render: (_, item) => item.displayName || "-",
    },
    {
      title: "状态",
      key: "status",
      render: (_, item) => (
        <Tag color={tenantStatusColor(item.status)}>
          {translateTenantStatus(item.status)}
        </Tag>
      ),
    },
    {
      title: "操作",
      key: "actions",
      render: (_, item) => (
        <Space>
          {canUpdate && (
            <Button type="link" onClick={() => openEdit(item)}>
              编辑
            </Button>
          )}
          {canUpdate && item.status === "PENDING_ACTIVATION" && (
            <Button
              type="link"
              icon={<RedoOutlined />}
              onClick={() => {
                setReissueItem(item);
                setReissueEmail("");
              }}
            >
              重发首邀
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="平台中心 / 租户管理"
        title="租户管理"
        description="控制面租户目录；待激活租户不会出现在任何用户的租户切换器中。"
        metrics={[{ label: "租户总数", value: tenants.length }]}
        actions={
          canCreate ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增租户
            </Button>
          ) : undefined
        }
      />
      <div className="card af-table-card">
        <Table
          columns={columns}
          dataSource={tenants}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </div>
      <TenantForm
        open={showForm}
        isCreateMode={isCreateMode}
        editItem={editItem}
        submitting={submitting}
        onCancel={() => setShowForm(false)}
        onOk={handleSubmit}
        form={form}
      />
      <Modal
        open={Boolean(reissueItem)}
        title="重新签发首位管理员邀请"
        onCancel={() => setReissueItem(null)}
        onOk={handleReissue}
        confirmLoading={submitting}
      >
        <Input
          value={reissueEmail}
          onChange={(event) => setReissueEmail(event.target.value)}
          placeholder="新的首位管理员邮箱"
        />
      </Modal>
      <Modal
        open={Boolean(deliveryToken)}
        title="备用邀请凭证"
        onCancel={() => setDeliveryToken(null)}
        footer={
          <Button onClick={() => setDeliveryToken(null)}>我已保存</Button>
        }
      >
        <p>
          首位管理员使用该邮箱登录后会直接看到邀请，无需输入
          token。该凭证仅作为备用交付方式并只展示一次。
        </p>
        <Input
          readOnly
          value={
            deliveryToken && typeof window !== "undefined"
              ? `${window.location.origin}/invitation/accept?token=${encodeURIComponent(deliveryToken)}`
              : ""
          }
          addonAfter={
            <CopyOutlined
              onClick={() => {
                if (deliveryToken) {
                  void navigator.clipboard.writeText(
                    `${window.location.origin}/invitation/accept?token=${encodeURIComponent(deliveryToken)}`,
                  );
                }
              }}
            />
          }
        />
      </Modal>
    </div>
  );
}
