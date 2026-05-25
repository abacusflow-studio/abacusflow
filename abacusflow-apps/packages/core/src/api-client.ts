import { getConfig } from "@abacusflow/config";
import { getAuthClient } from "./auth";
import { redirect } from "./platform";
import { Configuration, type Middleware } from "./openapi/runtime";
import {
  ProductApi,
  DepotApi,
  InventoryApi,
  PartnerApi,
  TransactionApi,
  UserApi,
} from "./openapi/apis/index";

// Re-export all generated model types
export type {
  Product,
  ProductCategory,
  BasicProduct,
  BasicProductCategory,
  SelectableProduct,
  SelectableProductCategory,
  ProductType,
  ProductUnit,
  CreateProductInput,
  UpdateProductInput,
  CreateProductCategoryInput,
  UpdateProductCategoryInput,
  Depot,
  BasicDepot,
  CreateDepotInput,
  UpdateDepotInput,
  Inventory,
  BasicInventory,
  InventoryUnit,
  BasicInventoryUnit,
  InventoryUnitType,
  InventoryUnitStatus,
  SelectableInventoryUnit,
  AdjustWarningLineRequest,
  AssignInventoryUnitDepotRequest,
  Customer,
  BasicCustomer,
  SelectableCustomer,
  CreateCustomerInput,
  UpdateCustomerInput,
  Supplier,
  BasicSupplier,
  SelectableSupplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  PurchaseOrder,
  BasicPurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderItemInput,
  CreatePurchaseOrderInput,
  SaleOrder,
  BasicSaleOrder,
  SaleOrderItem,
  SaleOrderItemInput,
  CreateSaleOrderInput,
  OrderStatus,
  User,
  BasicUser,
  CreateUserInput,
  UpdateUserInput,
  Sex,
  PageTemplate,
  ErrorResponse,
} from "./openapi/models/index";

// Re-export generated API request interfaces
export type {
  ListBasicProductsPageRequest,
  UpdateProductRequest,
  ListBasicCustomersPageRequest,
  UpdateCustomerRequest as UpdateCustomerApiRequest,
  ListBasicSuppliersPageRequest,
  UpdateSupplierRequest as UpdateSupplierApiRequest,
  ListBasicPurchaseOrdersPageRequest,
  ListBasicSaleOrdersPageRequest,
  ListBasicInventoriesPageRequest,
  ListBasicInventoryUnitsPageRequest,
  ListSelectableInventoryUnitsRequest,
  ExportInventoryRequest,
  ExportInventoryFormatEnum,
  UpdateUserRequest as UpdateUserApiRequest,
} from "./openapi/apis/index";

// ---- Custom utility types ----

export type PageResponse<T> = Pick<
  import("./openapi/models/PageTemplate.js").PageTemplate,
  "totalElements" | "number" | "size"
> & {
  content: T[];
  totalPages?: number;
};

export interface OrderItem {
  id?: number;
  productId?: number;
  inventoryUnitId?: number;
  productName?: string;
  title?: string;
  inventoryUnitTitle?: string;
  quantity: number;
  unitPrice: number;
  discountedPrice?: number;
  serialNumber?: string;
  subtotal?: number;
}

// ---- API Configuration ----

function createApiConfig(): Configuration {
  const config = getConfig();
  return new Configuration({
    basePath: config.apiBaseUrl,
    accessToken: async () => {
      try {
        const auth = getAuthClient();
        return await auth.getAccessToken();
      } catch {
        return "";
      }
    },
    middleware: [
      {
        post: async (ctx: { response: Response }) => {
          const { response } = ctx;

          if (response.status === 401) {
            try {
              const auth = getAuthClient();
              await auth.login(getCurrentBrowserPath());
            } catch {
              redirect("/");
            }
            return response;
          }

          if (!response.ok) {
            let msg: string | undefined;
            try {
              const body = await response.clone().json();
              msg = body?.message;
            } catch {
              // 非 JSON 响应，忽略
            }
            throw new Error(msg ?? `请求失败 (${response.status})`);
          }

          return response;
        },
      } satisfies Middleware,
    ],
  });
}

let _config: Configuration | null = null;

function getCurrentBrowserPath(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}` || "/";
}

function getApiConfig(): Configuration {
  if (!_config) {
    _config = createApiConfig();
  }
  return _config;
}

// ---- Exported API Instances ----

export const productApi = new ProductApi(getApiConfig());
export const depotApi = new DepotApi(getApiConfig());
export const inventoryApi = new InventoryApi(getApiConfig());
export const partnerApi = new PartnerApi(getApiConfig());
export const transactionApi = new TransactionApi(getApiConfig());
export const userApi = new UserApi(getApiConfig());
