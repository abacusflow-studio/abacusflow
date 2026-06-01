import { partnerApi } from "@abacusflow/core";

/** 分页查询客户 */
export async function listCustomersPage(input: {
  pageIndex: number;
  pageSize: number;
  name?: string;
}) {
  return partnerApi.listBasicCustomersPage(input);
}

/** 获取客户详情 */
export async function getCustomer(id: number) {
  return partnerApi.getCustomer({ id });
}

/** 创建客户 */
export async function createCustomer(input: {
  name: string;
  phone?: string;
  address?: string;
}) {
  await partnerApi.addCustomer({ createCustomerInput: input });
}

/** 更新客户 */
export async function updateCustomer(
  id: number,
  input: {
    name: string;
    phone?: string;
    address?: string;
  },
) {
  await partnerApi.updateCustomer({ id, updateCustomerInput: input });
}

/** 删除客户 */
export async function deleteCustomer(id: number) {
  await partnerApi.deleteCustomer({ id });
}

/** 分页查询供应商 */
export async function listSuppliersPage(input: {
  pageIndex: number;
  pageSize: number;
  name?: string;
}) {
  return partnerApi.listBasicSuppliersPage(input);
}

/** 获取供应商详情 */
export async function getSupplier(id: number) {
  return partnerApi.getSupplier({ id });
}

/** 创建供应商 */
export async function createSupplier(input: {
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  email?: string;
  note?: string;
}) {
  await partnerApi.addSupplier({ createSupplierInput: input });
}

/** 更新供应商 */
export async function updateSupplier(
  id: number,
  input: {
    name: string;
    contactPerson?: string;
    phone?: string;
    address?: string;
    email?: string;
    note?: string;
  },
) {
  await partnerApi.updateSupplier({ id, updateSupplierInput: input });
}

/** 删除供应商 */
export async function deleteSupplier(id: number) {
  await partnerApi.deleteSupplier({ id });
}
