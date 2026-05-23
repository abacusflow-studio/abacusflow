import type { OrderStatus, ProductType, ProductUnit } from "@abacusflow/utils";

// ---- Common ----

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages?: number;
  size: number;
  number: number;
}

export interface PageRequest {
  pageIndex: number;
  pageSize: number;
}

export type Sex = "male" | "female";
export type InventoryUnitType = "instance" | "batch";
export type InventoryUnitStatus = "normal" | "consumed" | "canceled" | "reversed";
export type ExportInventoryFormat = "excel" | "pdf";

// ---- Product ----

export interface Product {
  id: number;
  name: string;
  specification?: string;
  type: ProductType;
  categoryId?: number;
  categoryName?: string;
  barcode?: string;
  unit: ProductUnit;
  enabled: boolean;
  note?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export type BasicProduct = Pick<
  Product,
  | "id"
  | "name"
  | "specification"
  | "type"
  | "categoryName"
  | "barcode"
  | "unit"
  | "enabled"
  | "note"
>;

export interface SelectableProduct {
  id: number;
  name: string;
  type: ProductType;
  barcode: string;
}

export interface ListBasicProductsPageRequest extends PageRequest {
  name?: string;
  type?: ProductType;
  enabled?: boolean;
  categoryId?: number;
}

export interface CreateProductRequest {
  name: string;
  specification?: string;
  type: ProductType;
  categoryId?: number;
  barcode?: string;
  unit: ProductUnit;
  note?: string;
}

export interface UpdateProductRequest extends CreateProductRequest {
  id: number;
  enabled?: boolean;
}

// ---- Product Category ----

export interface ProductCategory {
  id: number;
  name: string;
  parentId?: number;
  parentName?: string;
  description?: string;
  children?: ProductCategory[];
  createdAt?: string | number;
  updatedAt?: string | number;
}

export type BasicProductCategory = Pick<
  ProductCategory,
  "id" | "name" | "parentName"
>;

export interface SelectableProductCategory {
  id: number;
  name: string;
  parentId?: number;
  parentName?: string;
}

export interface CreateProductCategoryRequest {
  name: string;
  parentId?: number;
  description?: string;
}

export interface UpdateProductCategoryRequest
  extends CreateProductCategoryRequest {
  id: number;
}

// ---- Depot ----

export interface Depot {
  id: number;
  name: string;
  location?: string;
  capacity?: number;
  enabled: boolean;
}

export type BasicDepot = Depot;

export interface CreateDepotRequest {
  name: string;
  location?: string;
  capacity?: number;
}

export interface UpdateDepotRequest extends CreateDepotRequest {
  id: number;
  enabled?: boolean;
}

// ---- Inventory ----

export interface BasicInventory {
  id: number;
  productName: string;
  productType: ProductType;
  productSpecification?: string;
  productNote?: string;
  initialQuantity: number;
  quantity: number;
  remainingQuantity: number;
  depotNames: string[];
  safetyStock: number;
  maxStock: number;
  units?: BasicInventoryUnit[];
}

export interface Inventory {
  id: number;
  productId: number;
  safetyStock: number;
  maxStock: number;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface BasicInventoryUnit {
  id: number;
  type: InventoryUnitType;
  status: InventoryUnitStatus;
  title: string;
  purchaseOrderNo: string;
  saleOrderNos: string[];
  depotName?: string;
  initialQuantity: number;
  quantity: number;
  remainingQuantity: number;
  unitPrice: number;
  receivedAt: string | number;
  batchCode?: string;
  serialNumber?: string;
}

export interface InventoryUnit {
  id: number;
  unitType?: InventoryUnitType;
  type?: InventoryUnitType;
  inventoryId: number;
  purchaseOrderId: number;
  initialQuantity: number;
  quantity: number;
  remainingQuantity: number;
  unitPrice: number;
  depotId?: number;
  status: InventoryUnitStatus;
  saleOrderIds: number[];
  receivedAt: string | number;
  serialNumber?: string;
  batchCode?: string;
}

export interface SelectableInventoryUnit {
  id: number;
  type: InventoryUnitType;
  title: string;
  status: InventoryUnitStatus;
}

export interface AssignDepotRequest {
  inventoryUnitId: number;
  depotId: number;
}

export interface UpdateWarningLineRequest {
  inventoryId: number;
  safetyStock: number;
  maxStock: number;
}

export interface ListInventoryRequest extends PageRequest {
  productCategoryId?: number;
  productName?: string;
  productType?: ProductType;
  inventoryUnitCode?: string;
  depotName?: string;
}

export type ListInventoriesPageRequest = ListInventoryRequest;
export type ListInventoryUnitsPageRequest = ListInventoryRequest;

// ---- Partner (Customer / Supplier) ----

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  totalOrderCount?: number;
  totalOrderAmount?: number;
  totalOrders?: number;
  totalAmount?: number;
  lastOrderDate?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface SelectableCustomer {
  id: number;
  name: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone?: string;
  address?: string;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  id: number;
}

export interface Supplier {
  id: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  totalOrderCount?: number;
  totalOrderAmount?: number;
  totalOrders?: number;
  totalAmount?: number;
  lastOrderDate?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface SelectableSupplier {
  id: number;
  name: string;
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface UpdateSupplierRequest extends CreateSupplierRequest {
  id: number;
}

// ---- Transaction (Purchase / Sale Order) ----

export interface OrderItem {
  id?: number;
  productId?: number;
  inventoryUnitId?: number;
  productName?: string;
  title?: string;
  quantity: number;
  unitPrice: number;
  discountedPrice?: number;
  serialNumber?: string;
  subtotal?: number;
}

export interface PurchaseOrder {
  id: number;
  orderNo: string;
  orderDate: string;
  status: OrderStatus;
  supplierId: number;
  supplierName?: string;
  orderItems?: OrderItem[];
  items?: OrderItem[];
  totalAmount?: number;
  totalQuantity?: number;
  itemCount?: number;
  autoCompleteDate?: string;
  note?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface CreatePurchaseOrderRequest {
  supplierId: number;
  orderDate: string;
  note?: string;
  orderItems: Array<{
    productId: number;
    quantity: number;
    unitPrice: number;
    serialNumber?: string;
  }>;
}

export interface SaleOrder {
  id: number;
  orderNo: string;
  orderDate: string;
  status: OrderStatus;
  customerId: number;
  customerName?: string;
  orderItems?: OrderItem[];
  items?: OrderItem[];
  totalAmount?: number;
  totalQuantity?: number;
  itemCount?: number;
  autoCompleteDate?: string;
  discountFactor?: number;
  note?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface CreateSaleOrderRequest {
  customerId: number;
  orderDate: string;
  note?: string;
  orderItems: Array<{
    inventoryUnitId: number;
    quantity: number;
    unitPrice: number;
    discountFactor?: number;
  }>;
}

export interface ListOrdersPageRequest extends PageRequest {
  orderNo?: string;
  orderDate?: string;
  status?: OrderStatus;
  supplierName?: string;
  customerName?: string;
  productName?: string;
  serialNumber?: string;
  inventoryUnitName?: string;
}

// ---- User ----

export interface User {
  id: number;
  name: string;
  nick?: string;
  age?: number;
  sex?: Sex;
  roleIds?: number[];
  enabled?: boolean;
  locked?: boolean;
  createdAt?: string | number;
  updatedAt?: string | number;
}

export interface CreateUserRequest {
  name: string;
  nick?: string;
  age?: number;
  sex?: Sex;
}

export interface UpdateUserRequest extends Omit<CreateUserRequest, "name"> {
  id: number;
  name?: string;
}

// ---- Auth ----

export interface UserProfile {
  sub?: string;
  name?: string;
  email?: string;
  picture?: string;
  nickname?: string;
  [key: string]: unknown;
}
