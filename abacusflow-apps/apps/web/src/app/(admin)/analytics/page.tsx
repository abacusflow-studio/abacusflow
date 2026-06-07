import { AdminPageHeader } from "../../../components/admin-page-header";
import { OrderTrendChart } from "./components/order-trend-chart";
import { RevenueTrendChart } from "./components/revenue-trend-chart";
import { PurchaseCostChart } from "./components/purchase-cost-chart";
import { InventoryStatusChart } from "./components/inventory-status-chart";
import { ProductTypeChart } from "./components/product-type-chart";
import { TopCustomersChart } from "./components/top-customers-chart";
import { TopSuppliersChart } from "./components/top-suppliers-chart";
import { CategoryCostChart } from "./components/category-cost-chart";
import { DepotInventoryChart } from "./components/depot-inventory-chart";

export default function AnalyticsPage() {
  return (
    <div className="af-crud-page">
      <AdminPageHeader
        eyebrow="数据刻画 / 业务洞察"
        title="数据刻画"
        description="基于 Cube.js 聚合的业务指标趋势图，帮助洞察采购、销售、库存的运营规律。"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* 趋势 */}
        <div style={{ display: "flex", gap: 16 }}>
          <OrderTrendChart />
          <RevenueTrendChart />
        </div>

        {/* 采购 */}
        <div style={{ display: "flex", gap: 16 }}>
          <PurchaseCostChart />
          <CategoryCostChart />
        </div>

        {/* 销售 & 采购排名 */}
        <div style={{ display: "flex", gap: 16 }}>
          <TopCustomersChart />
          <TopSuppliersChart />
        </div>

        {/* 库存 */}
        <div style={{ display: "flex", gap: 16 }}>
          <DepotInventoryChart />
          <InventoryStatusChart />
        </div>

        {/* 商品 */}
        <div style={{ display: "flex", gap: 16 }}>
          <ProductTypeChart />
          <div style={{ flex: 1 }} />
        </div>
      </div>
    </div>
  );
}
