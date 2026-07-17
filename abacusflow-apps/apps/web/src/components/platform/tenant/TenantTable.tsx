'use client';

import React, { useState } from 'react';
import {
  Button,
  Table,
  Modal,
  Form,
  Tag,
  App,
  Space,
  Descriptions,
  Spin,
} from 'antd';
import { PlusOutlined, SwapOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { AdminPageHeader } from '@/components/admin-page-header';
import { useTenant } from '@/components/tenant-provider';
import {
  tenantApi,
  type TenantDetail,
  type TenantSummary,
  type UpdateTenantInput,
} from '@abacusflow/core';
import { TenantForm } from './TenantForm';
import { translateTenantStatus, tenantStatusColor, formatTimestamp } from './utils';

export function TenantTable() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const {
    tenants,
    currentTenantId,
    selectTenant,
    updateTenantInList,
    setBootstrapData,
  } = useTenant();

  const [editItem, setEditItem] = useState<TenantDetail | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showDetail, setShowDetail] = useState(false);
  const [detailItem, setDetailItem] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const refreshTenantList = async () => {
    try {
      const updatedTenants = await tenantApi.listTenants();
      setBootstrapData(
        updatedTenants.length > 1 ? 'MULTI_TENANT' : 'SINGLE_TENANT',
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

  const openEdit = async (record: TenantSummary) => {
    setIsCreateMode(false);
    setShowForm(true);
    setSubmitting(true);
    try {
      const detail = await tenantApi.getTenant({ tenantId: record.tenantId });
      setEditItem(detail);
      form.setFieldsValue({
        displayName: detail.displayName ?? '',
      });
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (tenantId: number) => {
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const item = await tenantApi.getTenant({ tenantId });
      setDetailItem(item);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '加载失败');
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
        await tenantApi.createTenant({
          createTenantInput: {
            name: values.name,
            displayName: values.displayName || undefined,
          },
        });
        message.success('创建成功');
        setShowForm(false);
        await refreshTenantList();
      } else if (editItem) {
        const payload: UpdateTenantInput = {
          displayName: values.displayName || null,
        };
        const updated = await tenantApi.updateTenant({
          tenantId: editItem.tenantId,
          updateTenantInput: payload,
        });
        message.success('更新成功');
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

  const columns: ColumnsType<TenantSummary> = [
    {
      title: '租户名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '显示名称',
      key: 'displayName',
      render: (_, record) => record.displayName || '-',
    },
    {
      title: '角色',
      key: 'roleNames',
      render: (_, record) =>
        record.roleNames.length > 0
          ? record.roleNames.map((r) => <Tag key={r}>{r}</Tag>)
          : '-',
    },
    {
      title: '当前',
      key: 'current',
      render: (_, record) =>
        record.tenantId === currentTenantId ? (
          <Tag color="success">当前</Tag>
        ) : null,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          {record.tenantId !== currentTenantId && (
            <Button
              type="link"
              size="small"
              icon={<SwapOutlined />}
              onClick={() => {
                selectTenant(record.tenantId);
                window.location.reload();
              }}
            >
              切换
            </Button>
          )}
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
        </Space>
      ),
    },
  ];

  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="平台中心 / 租户管理"
        title="租户管理"
        description="查看和管理平台上的所有租户，包括租户创建、编辑和切换。"
        metrics={[{ label: '租户总数', value: tenants.length }]}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增租户
          </Button>
        }
      />

      <div className="card af-table-card">
        <Table<TenantSummary>
          columns={columns}
          dataSource={tenants}
          rowKey="tenantId"
          loading={false}
          pagination={false}
          size="middle"
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
              display: 'flex',
              justifyContent: 'center',
              padding: '2rem 0',
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
              {detailItem.displayName ?? '-'}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={tenantStatusColor(detailItem.status)}>
                {translateTenantStatus(detailItem.status)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              {detailItem.roleNames.length > 0
                ? detailItem.roleNames.map((r) => <Tag key={r}>{r}</Tag>)
                : '-'}
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
