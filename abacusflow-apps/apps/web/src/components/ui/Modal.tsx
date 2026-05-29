"use client";

import React from "react";
import { Modal as AntModal } from "antd";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onOk?: () => void;
  okText?: string;
  cancelText?: string;
  okLoading?: boolean;
  width?: number;
  children: React.ReactNode;
}

export function Modal({
  open,
  title,
  onClose,
  onOk,
  okText = "确定",
  cancelText = "取消",
  okLoading = false,
  width = 520,
  children,
}: ModalProps) {
  return (
    <AntModal
      open={open}
      title={title}
      onCancel={onClose}
      {...(onOk ? { onOk: () => onOk() } : {})}
      okText={okText}
      cancelText={cancelText}
      confirmLoading={okLoading}
      width={width}
      destroyOnHidden
    >
      {children}
    </AntModal>
  );
}
