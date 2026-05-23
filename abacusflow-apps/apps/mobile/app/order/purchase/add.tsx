import { supplierApi, productApi, transactionApi } from "@abacusflow/core";
import { OrderFormScreen } from "@/components/order-form-screen";

export default function AddPurchaseOrderScreen() {
  return (
    <OrderFormScreen
      orderType="purchase"
      partnerLabel="供应商"
      loadPartners={async () => {
        const res = await supplierApi.listSuppliersPage({
          pageIndex: 1,
          pageSize: 100,
        });
        return res.content;
      }}
      loadProducts={async () => {
        const res = await productApi.listBasicProductsPage({
          pageIndex: 1,
          pageSize: 100,
        });
        return res.content;
      }}
      buildSubmitData={async ({ partnerId, orderDate, items }) => {
        await transactionApi.createPurchaseOrder({
          supplierId: partnerId,
          orderDate,
          items,
        });
      }}
    />
  );
}
