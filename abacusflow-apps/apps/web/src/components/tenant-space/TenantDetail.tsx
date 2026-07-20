'use client';

import React, { useEffect, useState } from 'react';
import { Descriptions, Tag, Spin, App, Button, Modal, Input, Form } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { AdminPageHeader } from '@/components/admin-page-header';
import { useTenant } from '@/components/tenant-provider';
import { usePermission } from '@/hooks/use-permission';
import { tenantApi, type TenantDetail, type UpdateTenantInput } from '@abacusflow/core';
import { translateTenantStatus, tenantStatusColor, formatTimestamp } from '../platform/tenant/utils';

export function TenantDetail() {
  const { message } = App.useApp();
  const [editForm] = Form.useForm();
  const { currentTenantId, updateTenantInList } = useTenant();
  const { can } = usePermission();
  const canUpdate = can('tenant:profile:update');

  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentTenantId) return;

    let cancelled = false;
    setLoading(true);

    tenantApi
      .getCurrentTenant()
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) {
          message.error(err instanceof Error ? err.message : '加载租户信息失败');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTenantId, message]);

  const openEdit = () => {
    if (!detail) return;
    editForm.setFieldsValue({ displayName: detail.displayName ?? '' });
    setShowEdit(true);
  };

  const handleEditSubmit = async () => {
    if (!detail) return;
    try {
      const values = await editForm.validateFields();
      setSubmitting(true);
      const payload: UpdateTenantInput = {
        displayName: values.displayName || null,
      };
      const updated = await tenantApi.updateCurrentTenant({
        updateTenantInput: payload,
      });
      message.success('更新成功');
      setShowEdit(false);
      setDetail(updated);
      updateTenantInList(detail.tenantId, {
        displayName: updated.displayName ?? undefined,
      });
    } catch (err) {
      if (err instanceof Error) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="af-crud-page">
        <AdminPageHeader
          eyebrow="租户空间 / 基本信息"
          title="基本信息"
          description="当前租户的基本信息"
        />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="af-crud-page">
        <AdminPageHeader
          eyebrow="租户空间 / 基本信息"
          title="基本信息"
          description="当前租户的基本信息"
        />
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--colorTextSecondary, #666)' }}>
          无法加载租户信息
        </div>
      </div>
    );
  }

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="租户空间 / 基本信息"
        title="基本信息"
        description="当前租户的基本信息与配置"
        actions={canUpdate ? (
          <Button icon={<EditOutlined />} onClick={openEdit}>
            编辑
          </Button>
        ) : undefined}
      />

      <div className="card" style={{ padding: 24 }}>
        <Descriptions
          column={2}
          size="middle"
          styles={{ label: { width: 120, fontWeight: 500 } }}
        >
          <Descriptions.Item label="租户名称">
            {detail.name}
          </Descriptions.Item>
          <Descriptions.Item label="显示名称">
            {detail.displayName ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={tenantStatusColor(detail.status)}>
              {translateTenantStatus(detail.status)}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="角色">
            {detail.roleNames.length > 0
              ? detail.roleNames.map((r) => <Tag key={r}>{r}</Tag>)
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatTimestamp(detail.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatTimestamp(detail.updatedAt)}
          </Descriptions.Item>
        </Descriptions>

        {detail.permissionNames && detail.permissionNames.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>权限列表</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {detail.permissionNames.map((p) => {
                const isPlatform = p.startsWith('platform:');
                return (
                  <Tag key={p} color={isPlatform ? 'purple' : 'blue'}>
                    {p}
                  </Tag>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={showEdit}
        title="编辑租户信息"
        onCancel={() => setShowEdit(false)}
        onOk={handleEditSubmit}
        confirmLoading={submitting}
        width={520}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item label="租户名称（不可修改）">
            <Input value={detail.name} disabled />
          </Form.Item>
          <Form.Item name="displayName" label="显示名称">
            <Input placeholder="请输入显示名称" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
