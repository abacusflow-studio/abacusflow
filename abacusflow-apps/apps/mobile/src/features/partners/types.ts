import type { BasicCustomer, BasicSupplier } from "@abacusflow/core";

/** 客户列表项（直接使用 core 类型） */
export type CustomerListItem = BasicCustomer;

/** 供应商列表项（直接使用 core 类型） */
export type SupplierListItem = BasicSupplier;

/** 客户/供应商表单数据 */
export interface PartnerFormData {
  name: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  email?: string;
  note?: string;
}
