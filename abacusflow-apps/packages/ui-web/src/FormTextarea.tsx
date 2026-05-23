"use client";

import React from "react";
import { Input } from "antd";

interface FormTextareaProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  rows?: number;
}

export function FormTextarea({ error, ...props }: FormTextareaProps) {
  return (
    <Input.TextArea
      {...props}
      {...(error ? { status: "error" as const } : {})}
      autoSize={{ minRows: 3 }}
    />
  );
}
