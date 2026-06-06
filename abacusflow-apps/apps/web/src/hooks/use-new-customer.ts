"use client";

import { useState, useCallback } from "react";
import type { MessageInstance } from "antd/es/message/interface";
import { partnerApi } from "@abacusflow/core";
import type { SelectOption } from "../components/order-list-types";

export interface NewCustomerFormState {
  name: string;
  phone: string;
  address: string;
}

interface UseNewCustomerOptions {
  onCreated: (option: SelectOption) => void;
  message: MessageInstance;
}

export function useNewCustomer({ onCreated, message }: UseNewCustomerOptions) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState<NewCustomerFormState>({
    name: "",
    phone: "",
    address: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const open = useCallback(() => {
    setForm({ name: "", phone: "", address: "" });
    setErrors({});
    setShow(true);
  }, []);

  const close = useCallback(() => setShow(false), []);

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "请输入客户名称";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const created = await partnerApi.addCustomer({
        createCustomerInput: {
          name: form.name.trim(),
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
        },
      });
      onCreated({ label: created.name, value: String(created.id) });
      setShow(false);
      message.success("新增客户成功");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "新增客户失败");
    } finally {
      setSubmitting(false);
    }
  };

  return {
    show,
    close,
    form,
    setForm,
    errors,
    submitting,
    open,
    handleSubmit,
  };
}
