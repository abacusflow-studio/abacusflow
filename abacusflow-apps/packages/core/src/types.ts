import type { OrderStatus, ProductType, ProductUnit } from "@abacusflow/utils";

// ---- Common ----

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface PageRequest {
  pageIndex: number;
  pageSize: number;
}

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
  createdAt?: string;
  updatedAt?: string;
}

export type BasicProduct = Pick<
  Product,
  "id" | "name" | "specification" | "type" | "categoryName" | "barcode" | "unit" | "enabled" | "note"
>;

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
}

// ---- Product Category ----

export interface ProductCategory {
  id: number;
  name: string;
  parentId?: number;
  description?: string;
  children?: ProductCategory[];
}

export interface CreateProductCategoryRequest {
  name: string;
  parentId?: number;
  description?: string;
}

export interface UpdateProductCategoryRequest extends CreateProductCategoryRequest {
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
}

// ---- Inventory ----

export interface InventoryUnit {
  id: number;
  productId: number;
  productName: string;
  productUnit: ProductUnit;
  productType: ProductType;
  depotId?: number;
  depotName?: string;
  quantity: number;
  safetyStock?: number;
  maxStock?: number;
  categoryName?: string;
}

export interface AssignDepotRequest {
  inventoryId: number;
  depotId: number;
}

export interface UpdateWarningLineRequest {
  inventoryId: number;
  safetyStock?: number;
  maxStock?: number;
}

export interface ListInventoriesPageRequest extends PageRequest {
  productName?: string;
  unitCode?: string;
  productType?: ProductType;
  depotId?: number;
  categoryId?: number;
}

// ---- Partner (Customer / Supplier) ----

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  totalOrders?: number;
  totalAmount?: number;
  createdAt?: string;
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
  totalOrders?: number;
  totalAmount?: number;
  createdAt?: string;
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
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
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
  items: OrderItem[];
  totalAmount?: number;
  createdAt?: string;
}

export interface CreatePurchaseOrderRequest {
  supplierId: number;
  orderDate: string;
  items: Omit<OrderItem, "id" | "productName" | "subtotal">[];
}

export interface SaleOrder {
  id: number;
  orderNo: string;
  orderDate: string;
  status: OrderStatus;
  customerId: number;
  customerName?: string;
  items: OrderItem[];
  totalAmount?: number;
  discountFactor?: number;
  createdAt?: string;
}

export interface CreateSaleOrderRequest {
  customerId: number;
  orderDate: string;
  discountFactor?: number;
  items: Omit<OrderItem, "id" | "productName" | "subtotal">[];
}

export interface ListOrdersPageRequest extends PageRequest {
  orderNo?: string;
  orderDate?: string;
  productName?: string;
  serialNumber?: string;
  partnerName?: string;
}

// ---- User ----

export interface User {
  id: number;
  name: string;
  nick?: string;
  age?: number;
  sex?: string;
}

export interface CreateUserRequest {
  name: string;
  nick?: string;
  age?: number;
  sex?: string;
}

export interface UpdateUserRequest extends CreateUserRequest {
  id: number;
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
