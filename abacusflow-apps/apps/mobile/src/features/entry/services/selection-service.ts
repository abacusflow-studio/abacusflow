import { partnerApi, productApi } from "@abacusflow/core";
import type { SelectableProduct } from "@abacusflow/core";
import type { PartnerOption } from "../types";

/** 加载可选供应商列表 */
export async function loadSelectableSuppliers(): Promise<PartnerOption[]> {
  const res = await partnerApi.listSelectableSuppliers();
  return res.map((p) => ({ id: p.id, name: p.name }));
}

/** 加载可选客户列表 */
export async function loadSelectableCustomers(): Promise<PartnerOption[]> {
  const res = await partnerApi.listSelectableCustomers();
  return res.map((p) => ({ id: p.id, name: p.name }));
}

/** 加载可选产品列表 */
export async function loadSelectableProducts(): Promise<SelectableProduct[]> {
  return productApi.listSelectableProducts();
}

/** 并行加载合作伙伴和产品数据（采购入库） */
export async function loadPurchaseSelectionData(): Promise<{
  partners: PartnerOption[];
  products: SelectableProduct[];
}> {
  const [partners, products] = await Promise.all([
    loadSelectableSuppliers(),
    loadSelectableProducts(),
  ]);
  return { partners, products };
}

/** 并行加载合作伙伴和产品数据（销售出库） */
export async function loadSaleSelectionData(): Promise<{
  partners: PartnerOption[];
  products: SelectableProduct[];
}> {
  const [partners, products] = await Promise.all([
    loadSelectableCustomers(),
    loadSelectableProducts(),
  ]);
  return { partners, products };
}
