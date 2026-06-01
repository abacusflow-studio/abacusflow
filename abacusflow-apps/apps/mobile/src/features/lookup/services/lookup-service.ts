import {
  productApi,
  inventoryApi,
  transactionApi,
  type BasicProduct,
  type BasicInventory,
  type BasicPurchaseOrder,
  type BasicSaleOrder,
} from "@abacusflow/core";

const PAGE_SIZE = 50;

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
export async function searchProducts(
  query: string,
): Promise<BasicProduct[]> {
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

/** 搜索订单（按单号/供应商/客户/产品名/库存单元名） */
export async function searchOrders(query: string): Promise<{
  purchaseOrders: BasicPurchaseOrder[];
  saleOrders: BasicSaleOrder[];
}> {
  const [
    purchaseByNo,
    purchaseBySupplier,
    purchaseByProduct,
    saleByNo,
    saleByCustomer,
    saleByInventoryUnit,
  ] = await Promise.all([
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
  return {
    purchaseOrders: mergeById(
      purchaseByNo.content,
      purchaseBySupplier.content,
      purchaseByProduct.content,
    ),
    saleOrders: mergeById(
      saleByNo.content,
      saleByCustomer.content,
      saleByInventoryUnit.content,
    ),
  };
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
