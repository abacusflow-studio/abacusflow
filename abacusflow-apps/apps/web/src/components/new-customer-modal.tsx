"use client";

import React from "react";
import { Modal, Form, Input } from "antd";
import type { NewCustomerFormState } from "../hooks/use-new-customer";

interface NewCustomerModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: () => void;
  confirmLoading: boolean;
  form: NewCustomerFormState;
  errors: Record<string, string>;
  onChange: (patch: Partial<NewCustomerFormState>) => void;
}

export function NewCustomerModal({
  open,
  onCancel,
  onOk,
  confirmLoading,
  form,
  errors,
  onChange,
}: NewCustomerModalProps) {
  return (
    <Modal
      open={open}
      title="新增客户"
      onCancel={onCancel}
      onOk={onOk}
      confirmLoading={confirmLoading}
      width={480}
      destroyOnHidden
    >
      <div style={{ marginTop: 16 }}>
        <Form.Item label="客户名称" required style={{ marginBottom: 12 }}>
          <Input
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="请输入客户名称"
            status={errors.name ? "error" : undefined}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </Form.Item>
        <Form.Item label="联系电话" style={{ marginBottom: 12 }}>
          <Input
            value={form.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="请输入联系电话（可选）"
          />
        </Form.Item>
        <Form.Item label="地址" style={{ marginBottom: 0 }}>
          <Input
            value={form.address}
            onChange={(e) => onChange({ address: e.target.value })}
            placeholder="请输入地址（可选）"
          />
        </Form.Item>
      </div>
    </Modal>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <div style={{ color: "#ff4d4f", fontSize: 12 }}>{children}</div>;
}
