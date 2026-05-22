import { getConfig } from "@abacusflow/config";
import { getAuthClient } from "./auth";
import { redirect } from "./platform";
import type {
  BasicDepot,
  BasicProduct,
  CreateCustomerRequest,
  CreateDepotRequest,
  CreateProductCategoryRequest,
  CreateProductRequest,
  CreatePurchaseOrderRequest,
  CreateSaleOrderRequest,
  CreateSupplierRequest,
  CreateUserRequest,
  Customer,
  Depot,
  InventoryUnit,
  ListBasicProductsPageRequest,
  ListInventoriesPageRequest,
  ListOrdersPageRequest,
  PageResponse,
  Product,
  ProductCategory,
  PurchaseOrder,
  SaleOrder,
  Supplier,
  UpdateCustomerRequest,
  UpdateDepotRequest,
  UpdateProductCategoryRequest,
  UpdateProductRequest,
  UpdateSupplierRequest,
  UpdateUserRequest,
  UpdateWarningLineRequest,
  User,
  AssignDepotRequest,
} from "./types";

type FetchOptions = RequestInit & { params?: Record<string, string | number | boolean | undefined> };

async function request<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const config = getConfig();
  const { params, ...init } = options;

  let url = `${config.apiBaseUrl}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = new Headers(init.headers);
  headers.set("X-Requested-With", "XMLHttpRequest");

  try {
    const auth = getAuthClient();
    if (await auth.isAuthenticated()) {
      const token = await auth.getAccessToken();
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    // not authenticated
  }

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    if (response.status === 401) {
      try {
        const auth = getAuthClient();
        await auth.login("/");
      } catch {
        redirect("/");
      }
    }
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  return request<T>(path, { method: "GET", params });
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

// ---- Product API ----

export const productApi = {
  listBasicProductsPage: (params: ListBasicProductsPageRequest) =>
    get<PageResponse<BasicProduct>>("/products", params as unknown as Record<string, string | number | boolean | undefined>),
  getProduct: (id: number) => get<Product>(`/products/${id}`),
  createProduct: (data: CreateProductRequest) => post<Product>("/products", data),
  updateProduct: (data: UpdateProductRequest) => put<Product>(`/products/${data.id}`, data),
  deleteProduct: (id: number) => del<void>(`/products/${id}`),
};

// ---- Product Category API ----

export const productCategoryApi = {
  listCategories: () => get<ProductCategory[]>("/products/categories"),
  getCategory: (id: number) => get<ProductCategory>(`/products/categories/${id}`),
  createCategory: (data: CreateProductCategoryRequest) => post<ProductCategory>("/products/categories", data),
  updateCategory: (data: UpdateProductCategoryRequest) =>
    put<ProductCategory>(`/products/categories/${data.id}`, data),
  deleteCategory: (id: number) => del<void>(`/products/categories/${id}`),
};

// ---- Depot API ----

export const depotApi = {
  listBasicDepots: () => get<BasicDepot[]>("/depots"),
  getDepot: (id: number) => get<Depot>(`/depots/${id}`),
  createDepot: (data: CreateDepotRequest) => post<Depot>("/depots", data),
  updateDepot: (data: UpdateDepotRequest) => put<Depot>(`/depots/${data.id}`, data),
  deleteDepot: (id: number) => del<void>(`/depots/${id}`),
};

// ---- Inventory API ----

export const inventoryApi = {
  listInventoriesPage: (params: ListInventoriesPageRequest) =>
    get<PageResponse<InventoryUnit>>("/inventories", params as unknown as Record<string, string | number | boolean | undefined>),
  getInventory: (id: number) => get<InventoryUnit>(`/inventories/${id}`),
  assignDepot: (data: AssignDepotRequest) => put<void>(`/inventories/${data.inventoryId}/depot`, data),
  updateWarningLine: (data: UpdateWarningLineRequest) =>
    put<void>(`/inventories/${data.inventoryId}/warning-line`, data),
};

// ---- Customer API ----

export const customerApi = {
  listCustomersPage: (params: { pageIndex: number; pageSize: number; name?: string; phone?: string; address?: string }) =>
    get<PageResponse<Customer>>("/partners/customers", params as unknown as Record<string, string | number | boolean | undefined>),
  getCustomer: (id: number) => get<Customer>(`/partners/customers/${id}`),
  createCustomer: (data: CreateCustomerRequest) => post<Customer>("/partners/customers", data),
  updateCustomer: (data: UpdateCustomerRequest) => put<Customer>(`/partners/customers/${data.id}`, data),
  deleteCustomer: (id: number) => del<void>(`/partners/customers/${id}`),
};

// ---- Supplier API ----

export const supplierApi = {
  listSuppliersPage: (params: {
    pageIndex: number;
    pageSize: number;
    name?: string;
    contactPerson?: string;
    phone?: string;
    address?: string;
  }) =>
    get<PageResponse<Supplier>>("/partners/suppliers", params as unknown as Record<string, string | number | boolean | undefined>),
  getSupplier: (id: number) => get<Supplier>(`/partners/suppliers/${id}`),
  createSupplier: (data: CreateSupplierRequest) => post<Supplier>("/partners/suppliers", data),
  updateSupplier: (data: UpdateSupplierRequest) => put<Supplier>(`/partners/suppliers/${data.id}`, data),
  deleteSupplier: (id: number) => del<void>(`/partners/suppliers/${id}`),
};

// ---- Transaction API (Purchase & Sale Orders) ----

export const transactionApi = {
  listPurchaseOrdersPage: (params: ListOrdersPageRequest) =>
    get<PageResponse<PurchaseOrder>>("/transactions/purchase-orders", params as unknown as Record<string, string | number | boolean | undefined>),
  getPurchaseOrder: (id: number) => get<PurchaseOrder>(`/transactions/purchase-orders/${id}`),
  createPurchaseOrder: (data: CreatePurchaseOrderRequest) =>
    post<PurchaseOrder>("/transactions/purchase-orders", data),
  completePurchaseOrder: (id: number) => put<void>(`/transactions/purchase-orders/${id}/complete`),
  cancelPurchaseOrder: (id: number) => put<void>(`/transactions/purchase-orders/${id}/cancel`),
  reversePurchaseOrder: (id: number) => put<void>(`/transactions/purchase-orders/${id}/reverse`),

  listSaleOrdersPage: (params: ListOrdersPageRequest) =>
    get<PageResponse<SaleOrder>>("/transactions/sale-orders", params as unknown as Record<string, string | number | boolean | undefined>),
  getSaleOrder: (id: number) => get<SaleOrder>(`/transactions/sale-orders/${id}`),
  createSaleOrder: (data: CreateSaleOrderRequest) => post<SaleOrder>("/transactions/sale-orders", data),
  completeSaleOrder: (id: number) => put<void>(`/transactions/sale-orders/${id}/complete`),
  cancelSaleOrder: (id: number) => put<void>(`/transactions/sale-orders/${id}/cancel`),
  reverseSaleOrder: (id: number) => put<void>(`/transactions/sale-orders/${id}/reverse`),
};

// ---- User API ----

export const userApi = {
  listUsersPage: (params: { pageIndex: number; pageSize: number; name?: string }) =>
    get<PageResponse<User>>("/users", params as unknown as Record<string, string | number | boolean | undefined>),
  getUser: (id: number) => get<User>(`/users/${id}`),
  createUser: (data: CreateUserRequest) => post<User>("/users", data),
  updateUser: (data: UpdateUserRequest) => put<User>(`/users/${data.id}`, data),
  deleteUser: (id: number) => del<void>(`/users/${id}`),
};
