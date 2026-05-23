"use client";

import React from "react";
import { OrderListPage } from "../../../../components/order-list-page";
import { transactionApi } from "@abacusflow/core";

export default function PurchaseOrdersPage() {
  return (
    <OrderListPage
      title="采购单管理"
      orderType="purchase"
      partnerLabel="供应商"
      partnerKey="supplierName"
      listFn={(params) => transactionApi.listBasicPurchaseOrdersPage(params)}
      getDetailFn={(id) => transactionApi.getPurchaseOrder({ id })}
      completeFn={(id) => transactionApi.completePurchaseOrder({ id })}
      cancelFn={(id) => transactionApi.cancelPurchaseOrder({ id })}
      reverseFn={(id) => transactionApi.reversePurchaseOrder({ id })}
    />
  );
}
