"use client";

import React from "react";
import { Form } from "antd";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  required,
  error,
  children,
}: FormFieldProps) {
  return (
    <Form.Item
      label={label}
      required={required}
      validateStatus={error ? "error" : undefined}
      help={error}
      style={{ marginBottom: 12 }}
    >
      {children}
    </Form.Item>
  );
}
