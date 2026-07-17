'use client';

import React from 'react';
import { Modal, Input, Form } from 'antd';
import type { TenantDetail } from '@abacusflow/core';

interface TenantFormProps {
  open: boolean;
  isCreateMode: boolean;
  editItem: TenantDetail | null;
  submitting: boolean;
  onCancel: () => void;
  onOk: () => void;
  form: ReturnType<typeof Form.useForm>[0];
}

export function TenantForm({
  open,
  isCreateMode,
  editItem,
  submitting,
  onCancel,
  onOk,
  form,
}: TenantFormProps) {
  return (
    <Modal
      open={open}
      title={isCreateMode ? '新增租户' : '编辑租户'}
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={submitting}
      width={520}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {isCreateMode ? (
          <Form.Item
            name="name"
            label="租户名称"
            rules={[{ required: true, message: '请输入租户名称' }]}
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
  );
}
