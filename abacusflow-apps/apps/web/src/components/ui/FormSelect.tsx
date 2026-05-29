"use client";

import React from "react";
import { Select } from "antd";

interface FormSelectProps {
  options: { label: string; value: string | number }[];
  placeholder?: string;
  error?: boolean;
  value?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function FormSelect({
  options,
  placeholder,
  error,
  value,
  onChange,
  ...props
}: FormSelectProps) {
  return (
    <Select
      {...props}
      {...(error ? { status: "error" as const } : {})}
      value={value !== undefined && value !== "" ? value : undefined}
      onChange={(val) => {
        if (val !== undefined) onChange?.({ target: { value: String(val) } });
      }}
      placeholder={placeholder}
      options={options}
      style={{ width: "100%" }}
      allowClear
    />
  );
}
