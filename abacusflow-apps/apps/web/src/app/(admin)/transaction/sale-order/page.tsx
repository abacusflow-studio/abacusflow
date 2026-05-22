"use client";

import React from "react";
import { OrderListPage } from "../../../../components/order-list-page";
import { transactionApi } from "@abacusflow/core";

export default function SaleOrdersPage() {
  return (
    <OrderListPage
      title="销售单管理"
      orderType="sale"
      partnerLabel="客户"
      partnerKey="customerName"
      listFn={transactionApi.listSaleOrdersPage}
      completeFn={transactionApi.completeSaleOrder}
      cancelFn={transactionApi.cancelSaleOrder}
      reverseFn={transactionApi.reverseSaleOrder}
    />
  );
}
