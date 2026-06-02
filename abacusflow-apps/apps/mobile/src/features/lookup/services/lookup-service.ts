import {
  productApi,
  inventoryApi,
  transactionApi,
  partnerApi,
  depotApi,
  type BasicProduct,
  type BasicInventory,
  type BasicPurchaseOrder,
  type BasicSaleOrder,
  type BasicCustomer,
  type BasicSupplier,
  type BasicDepot,
} from "@abacusflow/core";

const PAGE_SIZE = 20;

/** 合并多个数组并按 id 去重 */
function mergeById<T extends { id: number }>(
  ...groups: (readonly T[] | undefined)[]
): T[] {
  const map = new Map<number, T>();
  groups
    .flatMap((group) => group ?? [])
    .forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

/** 通过条码查找产品（两步：先查 selectable，再查 basic page） */
export async function findBasicProductByBarcode(
  barcode: string,
): Promise<BasicProduct | null> {
  const selectableProducts = await productApi.listSelectableProducts();
  const matched = selectableProducts.find((item) => item.barcode === barcode);
  if (!matched) return null;

  const res = await productApi.listBasicProductsPage({
    pageIndex: 1,
    pageSize: PAGE_SIZE,
    name: matched.name,
    type: matched.type,
  });
  return (
    res.content.find((item) => item.id === matched.id) ??
    res.content.find((item) => item.barcode === barcode) ??
    null
  );
}

/** 查找产品的库存列表 */
export async function findInventoriesForProduct(
  product: BasicProduct,
): Promise<BasicInventory[]> {
  const res = await inventoryApi.listBasicInventoriesPage({
    pageIndex: 1,
    pageSize: PAGE_SIZE,
    productName: product.name,
    productType: product.type,
  });
  return res.content.filter(
    (item) =>
      item.productName === product.name && item.productType === product.type,
  );
}

/** 搜索产品（按名称 + 条码） */
export async function searchProducts(query: string): Promise<BasicProduct[]> {
  const [nameRes, barcodeProduct] = await Promise.all([
    productApi.listBasicProductsPage({
      pageIndex: 1,
      pageSize: PAGE_SIZE,
      name: query,
    }),
    findBasicProductByBarcode(query),
  ]);
  return mergeById(nameRes.content, barcodeProduct ? [barcodeProduct] : []);
}

/** 搜索库存（按产品名 + 单元码 + 条码） */
export async function searchInventories(
  query: string,
): Promise<BasicInventory[]> {
  const [productNameRes, unitCodeRes, barcodeProduct] = await Promise.all([
    inventoryApi.listBasicInventoriesPage({
      pageIndex: 1,
      pageSize: PAGE_SIZE,
      productName: query,
    }),
    inventoryApi.listBasicInventoriesPage({
      pageIndex: 1,
      pageSize: PAGE_SIZE,
      inventoryUnitCode: query,
    }),
    findBasicProductByBarcode(query),
  ]);
  const barcodeInventories = barcodeProduct
    ? await findInventoriesForProduct(barcodeProduct)
    : [];
  return mergeById(
    productNameRes.content,
    unitCodeRes.content,
    barcodeInventories,
  );
}

/** 搜索采购单（按单号/供应商/产品名） */
export async function searchPurchaseOrders(
  query: string,
): Promise<BasicPurchaseOrder[]> {
  const [byNo, bySupplier, byProduct] = await Promise.all([
    transactionApi.listBasicPurchaseOrdersPage({
      pageIndex: 1,
      pageSize: PAGE_SIZE,
      orderNo: query,
    }),
    transactionApi.listBasicPurchaseOrdersPage({
      pageIndex: 1,
      pageSize: PAGE_SIZE,
      supplierName: query,
    }),
    transactionApi.listBasicPurchaseOrdersPage({
      pageIndex: 1,
      pageSize: PAGE_SIZE,
      productName: query,
    }),
  ]);
  return mergeById(byNo.content, bySupplier.content, byProduct.content);
}

/** 搜索销售单（按单号/客户/库存单元名） */
export async function searchSaleOrders(
  query: string,
): Promise<BasicSaleOrder[]> {
  const [byNo, byCustomer, byInventoryUnit] = await Promise.all([
    transactionApi.listBasicSaleOrdersPage({
      pageIndex: 1,
      pageSize: PAGE_SIZE,
      orderNo: query,
    }),
    transactionApi.listBasicSaleOrdersPage({
      pageIndex: 1,
      pageSize: PAGE_SIZE,
      customerName: query,
    }),
    transactionApi.listBasicSaleOrdersPage({
      pageIndex: 1,
      pageSize: PAGE_SIZE,
      inventoryUnitName: query,
    }),
  ]);
  return mergeById(byNo.content, byCustomer.content, byInventoryUnit.content);
}

/** 通过条码查库存（扫码入口用） */
export async function findInventoriesByBarcode(
  barcode: string,
): Promise<BasicInventory[]> {
  const product = await findBasicProductByBarcode(barcode);
  if (product) {
    return findInventoriesForProduct(product);
  }
  // 按单元码查
  const unitCodeRes = await inventoryApi.listBasicInventoriesPage({
    pageIndex: 1,
    pageSize: PAGE_SIZE,
    inventoryUnitCode: barcode,
  });
  return unitCodeRes.content;
}

/** 搜索客户（按名称） */
export async function searchCustomers(query: string): Promise<BasicCustomer[]> {
  const res = await partnerApi.listBasicCustomersPage({
    pageIndex: 1,
    pageSize: PAGE_SIZE,
    name: query,
  });
  return res.content;
}

/** 搜索供应商（按名称） */
export async function searchSuppliers(query: string): Promise<BasicSupplier[]> {
  const res = await partnerApi.listBasicSuppliersPage({
    pageIndex: 1,
    pageSize: PAGE_SIZE,
    name: query,
  });
  return res.content;
}

/** 搜索储存点（按名称） */
export async function searchDepots(query: string): Promise<BasicDepot[]> {
  const all = await depotApi.listBasicDepots();
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      (d.location && d.location.toLowerCase().includes(q)),
  );
}
