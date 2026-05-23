import { getConfig } from "@abacusflow/config";
import { getAuthClient } from "./auth";
import { redirect } from "./platform";
import type {
  AssignDepotRequest,
  BasicDepot,
  BasicInventory,
  BasicInventoryUnit,
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
  ExportInventoryFormat,
  Inventory,
  InventoryUnit,
  ListBasicProductsPageRequest,
  ListInventoriesPageRequest,
  ListInventoryUnitsPageRequest,
  ListOrdersPageRequest,
  PageResponse,
  Product,
  ProductCategory,
  PurchaseOrder,
  SaleOrder,
  SelectableCustomer,
  SelectableInventoryUnit,
  SelectableProduct,
  SelectableProductCategory,
  SelectableSupplier,
  Supplier,
  UpdateCustomerRequest,
  UpdateDepotRequest,
  UpdateProductCategoryRequest,
  UpdateProductRequest,
  UpdateSupplierRequest,
  UpdateUserRequest,
  UpdateWarningLineRequest,
  User,
} from "./types";

type QueryParam =
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | undefined
  | null;

type FetchOptions = RequestInit & {
  params?: Record<string, QueryParam>;
};

let isRedirectingToLogin = false;

function appendParams(url: string, params?: Record<string, QueryParam>): string {
  if (!params) return url;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, String(item)));
    } else {
      searchParams.set(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `${url}?${qs}` : url;
}

async function withAuthHeaders(init: RequestInit = {}): Promise<Headers> {
  const headers = new Headers(init.headers);
  headers.set("X-Requested-With", "XMLHttpRequest");

  try {
    const auth = getAuthClient();
    const token = await auth.getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch {
    // not authenticated
  }

  return headers;
}

async function handleError(response: Response, path: string, method: string) {
  console.error(`[api-client] ${response.status} ${method} ${path}`);

  if (response.status === 401 && !isRedirectingToLogin) {
    isRedirectingToLogin = true;
    try {
      const auth = getAuthClient();
      await auth.login("/");
    } catch {
      redirect("/");
    }
  }

  const error = await response
    .clone()
    .json()
    .catch(() => ({ message: `HTTP ${response.status}` }));
  throw new Error(error.message || `HTTP ${response.status}`);
}

async function request<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const config = getConfig();
  const { params, ...init } = options;
  const url = appendParams(`${config.apiBaseUrl}${path}`, params);
  const headers = await withAuthHeaders(init);
  const method = init.method || "GET";

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    await handleError(response, path, method);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function requestBlob(
  path: string,
  options: FetchOptions = {},
): Promise<Blob> {
  const config = getConfig();
  const { params, ...init } = options;
  const url = appendParams(`${config.apiBaseUrl}${path}`, params);
  const headers = await withAuthHeaders(init);
  const method = init.method || "GET";

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    await handleError(response, path, method);
  }

  return response.blob();
}

function get<T>(
  path: string,
  params?: Record<string, QueryParam>,
): Promise<T> {
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

function pageFromArray<T>(
  content: T[],
  pageIndex: number,
  pageSize: number,
): PageResponse<T> {
  const start = (pageIndex - 1) * pageSize;
  const page = content.slice(start, start + pageSize);
  return {
    content: page,
    totalElements: content.length,
    totalPages: Math.ceil(content.length / pageSize),
    size: pageSize,
    number: pageIndex - 1,
  };
}

// ---- Product API ----

export const productApi = {
  listBasicProductsPage: (params: ListBasicProductsPageRequest) =>
    get<PageResponse<BasicProduct>>(
      "/products",
      params as unknown as Record<string, QueryParam>,
    ),
  listSelectableProducts: () => get<SelectableProduct[]>("/products/selectable"),
  getProduct: (id: number) => get<Product>(`/products/${id}`),
  createProduct: (data: CreateProductRequest) =>
    post<Product>("/products", data),
  updateProduct: (data: UpdateProductRequest) =>
    put<Product>(`/products/${data.id}`, data),
  deleteProduct: (id: number) => del<void>(`/products/${id}`),
};

// ---- Product Category API ----

export const productCategoryApi = {
  listCategories: () =>
    get<ProductCategory[]>("/product-categories") as Promise<
      ProductCategory[]
    >,
  listBasicCategories: () =>
    get<ProductCategory[]>("/product-categories") as Promise<
      ProductCategory[]
    >,
  listSelectableCategories: () =>
    get<SelectableProductCategory[]>("/product-categories/selectable"),
  getCategory: (id: number) =>
    get<ProductCategory>(`/product-categories/${id}`),
  createCategory: (data: CreateProductCategoryRequest) =>
    post<ProductCategory>("/product-categories", data),
  updateCategory: (data: UpdateProductCategoryRequest) =>
    put<ProductCategory>(`/product-categories/${data.id}`, data),
  deleteCategory: (id: number) => del<void>(`/product-categories/${id}`),
};

// ---- Depot API ----

export const depotApi = {
  listBasicDepots: () => get<BasicDepot[]>("/depots"),
  getDepot: (id: number) => get<Depot>(`/depots/${id}`),
  createDepot: (data: CreateDepotRequest) => post<Depot>("/depots", data),
  updateDepot: (data: UpdateDepotRequest) =>
    put<Depot>(`/depots/${data.id}`, data),
  deleteDepot: (id: number) => del<void>(`/depots/${id}`),
};

// ---- Inventory API ----

export const inventoryApi = {
  listBasicInventoriesPage: (params: ListInventoriesPageRequest) =>
    get<PageResponse<BasicInventory>>(
      "/inventories",
      params as unknown as Record<string, QueryParam>,
    ),
  listBasicInventoryUnitsPage: (params: ListInventoryUnitsPageRequest) =>
    get<PageResponse<BasicInventoryUnit>>(
      "/inventory-units",
      params as unknown as Record<string, QueryParam>,
    ),
  listSelectableInventoryUnits: (statuses?: string[]) =>
    get<SelectableInventoryUnit[]>("/inventory-units/selectable", {
      statuses,
    }),
  getInventory: (id: number) => get<Inventory>(`/inventories/${id}`),
  getInventoryUnit: (id: number) =>
    get<InventoryUnit>(`/inventory-units/${id}`),
  assignDepot: (data: AssignDepotRequest) =>
    post<void>(`/inventory-units/${data.inventoryUnitId}/assign-depot`, {
      depotId: data.depotId,
    }),
  updateWarningLine: (data: UpdateWarningLineRequest) =>
    post<void>(`/inventories/${data.inventoryId}/adjust-warning-line`, {
      safetyStock: data.safetyStock,
      maxStock: data.maxStock,
    }),
  exportInventory: (
    format: ExportInventoryFormat,
    productCategoryId?: number,
  ) =>
    requestBlob(`/inventories/export/${format}`, {
      method: "GET",
      params: { productCategoryId },
    }),
};

// ---- Customer API ----

export const customerApi = {
  listCustomersPage: (params: {
    pageIndex: number;
    pageSize: number;
    name?: string;
    phone?: string;
    address?: string;
  }) =>
    get<PageResponse<Customer>>(
      "/customers",
      params as unknown as Record<string, QueryParam>,
    ),
  listSelectableCustomers: () =>
    get<SelectableCustomer[]>("/customers/selectable"),
  getCustomer: (id: number) => get<Customer>(`/customers/${id}`),
  createCustomer: (data: CreateCustomerRequest) =>
    post<Customer>("/customers", data),
  updateCustomer: (data: UpdateCustomerRequest) =>
    put<Customer>(`/customers/${data.id}`, data),
  deleteCustomer: (id: number) => del<void>(`/customers/${id}`),
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
    get<PageResponse<Supplier>>(
      "/suppliers",
      params as unknown as Record<string, QueryParam>,
    ),
  listSelectableSuppliers: () =>
    get<SelectableSupplier[]>("/suppliers/selectable"),
  getSupplier: (id: number) => get<Supplier>(`/suppliers/${id}`),
  createSupplier: (data: CreateSupplierRequest) =>
    post<Supplier>("/suppliers", data),
  updateSupplier: (data: UpdateSupplierRequest) =>
    put<Supplier>(`/suppliers/${data.id}`, data),
  deleteSupplier: (id: number) => del<void>(`/suppliers/${id}`),
};

// ---- Transaction API (Purchase & Sale Orders) ----

export const transactionApi = {
  listPurchaseOrdersPage: (params: ListOrdersPageRequest) =>
    get<PageResponse<PurchaseOrder>>(
      "/purchase-orders",
      params as unknown as Record<string, QueryParam>,
    ),
  getPurchaseOrder: (id: number) =>
    get<PurchaseOrder>(`/purchase-orders/${id}`),
  createPurchaseOrder: (data: CreatePurchaseOrderRequest) =>
    post<PurchaseOrder>("/purchase-orders", data),
  completePurchaseOrder: (id: number) =>
    post<void>(`/purchase-orders/${id}/complete`),
  cancelPurchaseOrder: (id: number) =>
    post<void>(`/purchase-orders/${id}/cancel`),
  reversePurchaseOrder: (id: number) =>
    post<void>(`/purchase-orders/${id}/reverse`),

  listSaleOrdersPage: (params: ListOrdersPageRequest) =>
    get<PageResponse<SaleOrder>>(
      "/sale-orders",
      params as unknown as Record<string, QueryParam>,
    ),
  getSaleOrder: (id: number) => get<SaleOrder>(`/sale-orders/${id}`),
  createSaleOrder: (data: CreateSaleOrderRequest) =>
    post<SaleOrder>("/sale-orders", data),
  completeSaleOrder: (id: number) => post<void>(`/sale-orders/${id}/complete`),
  cancelSaleOrder: (id: number) => post<void>(`/sale-orders/${id}/cancel`),
  reverseSaleOrder: (id: number) => post<void>(`/sale-orders/${id}/reverse`),
};

// ---- User API ----

export const userApi = {
  listBasicUsers: () => get<User[]>("/users"),
  listUsersPage: async (params: {
    pageIndex: number;
    pageSize: number;
    name?: string;
  }) => {
    const users = await get<User[]>("/users");
    const filtered = params.name
      ? users.filter((user) => user.name.includes(params.name ?? ""))
      : users;
    return pageFromArray(filtered, params.pageIndex, params.pageSize);
  },
  getUser: (id: number) => get<User>(`/users/${id}`),
  createUser: (data: CreateUserRequest) => post<User>("/users", data),
  updateUser: (data: UpdateUserRequest) => put<User>(`/users/${data.id}`, data),
  deleteUser: (id: number) => del<void>(`/users/${id}`),
};
