"use client";

import React, { useState } from "react";
import { Modal, Form, Input, Select, App } from "antd";
import { feedbackApi, type FeedbackCategory } from "@abacusflow/core";
import { usePathname } from "next/navigation";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  defaultDescription?: string;
}

const CATEGORY_OPTIONS = [
  { label: "Bug", value: "BUG" },
  { label: "数据不对", value: "DATA_WRONG" },
  { label: "操作不会用", value: "USABILITY" },
  { label: "功能建议", value: "FEATURE_REQUEST" },
  { label: "其他", value: "OTHER" },
];

export function FeedbackModal({
  open,
  onClose,
  defaultDescription,
}: FeedbackModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await feedbackApi.createFeedback({
        createFeedbackInput: {
          category: values.category as FeedbackCategory,
          source: "WEB",
          title: values.title || undefined,
          description: values.description,
          contact: values.contact || undefined,
          pagePath: pathname,
        },
      });

      message.success("反馈已提交，我们会尽快处理");
      form.resetFields();
      onClose();
    } catch (err) {
      if (err instanceof Error && !err.message.includes("validate")) {
        message.error(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={open}
      title="问题反馈"
      onCancel={handleCancel}
      onOk={handleSubmit}
      confirmLoading={submitting}
      destroyOnHidden
      okText="提交"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" initialValues={{ category: "BUG" }}>
        <Form.Item
          name="category"
          label="问题类型"
          rules={[{ required: true, message: "请选择问题类型" }]}
        >
          <Select options={CATEGORY_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="description"
          label="问题描述"
          rules={[
            { required: true, message: "请描述您遇到的问题" },
            { min: 4, message: "至少输入 4 个字符" },
          ]}
          initialValue={defaultDescription}
        >
          <Input.TextArea
            rows={4}
            placeholder="请描述您遇到的问题，越详细越好"
            maxLength={3000}
            showCount
          />
        </Form.Item>
        <Form.Item name="title" label="标题（可选）">
          <Input placeholder="一句话概括问题" maxLength={120} />
        </Form.Item>
        <Form.Item name="contact" label="联系方式（可选）">
          <Input placeholder="邮箱或手机号，方便我们联系您" maxLength={120} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
