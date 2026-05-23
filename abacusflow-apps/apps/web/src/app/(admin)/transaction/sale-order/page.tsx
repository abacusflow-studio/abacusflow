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
      listFn={(params) => transactionApi.listBasicSaleOrdersPage(params)}
      getDetailFn={(id) => transactionApi.getSaleOrder({ id })}
      completeFn={(id) => transactionApi.completeSaleOrder({ id })}
      cancelFn={(id) => transactionApi.cancelSaleOrder({ id })}
      reverseFn={(id) => transactionApi.reverseSaleOrder({ id })}
    />
  );
}
