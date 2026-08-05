"use client";

import React from "react";
import { Modal, Input, Form } from "antd";
import type { PlatformTenant } from "@abacusflow/core";

interface TenantFormProps {
  open: boolean;
  isCreateMode: boolean;
  editItem: PlatformTenant | null;
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
      title={isCreateMode ? "新增租户" : "编辑租户"}
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
        {isCreateMode && (
          <Form.Item
            name="initialAdministratorEmail"
            label="首位租户管理员邮箱"
            rules={[
              { required: true, message: "请输入首位管理员邮箱" },
              { type: "email", message: "请输入有效邮箱地址" },
            ]}
            extra="租户将保持待激活状态，直到此邮箱对应的已验证用户接受邀请。"
          >
            <Input placeholder="admin@example.com" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
