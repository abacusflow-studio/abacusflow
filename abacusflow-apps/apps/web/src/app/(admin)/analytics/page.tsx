import { AdminPageHeader } from "../../../components/admin-page-header";
import { OrderTrendChart } from "./components/order-trend-chart";
import { RevenueTrendChart } from "./components/revenue-trend-chart";
import { PurchaseCostChart } from "./components/purchase-cost-chart";
import { InventoryStatusChart } from "./components/inventory-status-chart";
import { ProductTypeChart } from "./components/product-type-chart";

export default function AnalyticsPage() {
  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="数据刻画 / 业务洞察"
        title="数据刻画"
        description="基于 Cube.js 聚合的业务指标趋势图，帮助洞察采购、销售、库存的运营规律。"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <OrderTrendChart />
          <RevenueTrendChart />
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <PurchaseCostChart />
          <InventoryStatusChart />
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <ProductTypeChart />
          <div style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
}
