"use client";

import React from "react";
import { Input } from "antd";

interface FormInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  error?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
}

export function FormInput({ error, ...props }: FormInputProps) {
  return <Input {...props} {...(error ? { status: "error" as const } : {})} />;
}
