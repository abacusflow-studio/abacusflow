import { useEffect, useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  productApi,
  inventoryApi,
  transactionApi,
  partnerApi,
  depotApi,
} from "@abacusflow/core";
import { CURRENT_VERSION } from "@abacusflow/config";

interface DashboardStats {
  productCount: number;
  inventoryCount: number;
  purchaseOrderCount: number;
  saleOrderCount: number;
  customerCount: number;
  supplierCount: number;
  depotCount: number;
  lowStockCount: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [
        products,
        inventories,
        purchaseOrders,
        saleOrders,
        customers,
        suppliers,
        depots,
      ] = await Promise.all([
        productApi.listBasicProductsPage({ pageIndex: 1, pageSize: 1 }),
        inventoryApi.listInventoriesPage({ pageIndex: 1, pageSize: 100 }),
        transactionApi.listPurchaseOrdersPage({ pageIndex: 1, pageSize: 1 }),
        transactionApi.listSaleOrdersPage({ pageIndex: 1, pageSize: 1 }),
        partnerApi.listBasicCustomersPage({ pageIndex: 1, pageSize: 1 }),
        partnerApi.listBasicSuppliersPage({ pageIndex: 1, pageSize: 1 }),
        depotApi.listBasicDepots(),
      ]);

      const lowStock = inventories.content.filter(
        (i) => i.safetyStock && i.quantity < i.safetyStock,
      ).length;

      setStats({
        productCount: products.totalElements,
        inventoryCount: inventories.totalElements,
        purchaseOrderCount: purchaseOrders.totalElements,
        saleOrderCount: saleOrders.totalElements,
        customerCount: customers.totalElements,
        supplierCount: suppliers.totalElements,
        depotCount: depots.length,
        lowStockCount: lowStock,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_ACTIONS = [
    {
      title: "产品管理",
      icon: "📋",
      href: "/(tabs)/products",
      color: "#1677ff",
    },
    {
      title: "库存查看",
      icon: "📦",
      href: "/(tabs)/inventory",
      color: "#52c41a",
    },
    {
      title: "新建采购",
      icon: "🛒",
      href: "/order/purchase/add" as any,
      color: "#fa8c16",
    },
    {
      title: "新建销售",
      icon: "🛍️",
      href: "/order/sale/add" as any,
      color: "#722ed1",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>欢迎使用</Text>
            <Text style={styles.appName}>小算盘</Text>
          </View>
          <Text style={styles.version}>v{CURRENT_VERSION}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1677ff" />
          </View>
        ) : stats ? (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard
                title="产品总数"
                value={stats.productCount}
                icon="📋"
                color="#1677ff"
              />
              <StatCard
                title="库存记录"
                value={stats.inventoryCount}
                icon="📦"
                color="#52c41a"
              />
              <StatCard
                title="采购单"
                value={stats.purchaseOrderCount}
                icon="🛒"
                color="#fa8c16"
              />
              <StatCard
                title="销售单"
                value={stats.saleOrderCount}
                icon="🛍️"
                color="#722ed1"
              />
              <StatCard
                title="客户数"
                value={stats.customerCount}
                icon="👤"
                color="#13c2c2"
              />
              <StatCard
                title="供应商"
                value={stats.supplierCount}
                icon="🏪"
                color="#eb2f96"
              />
              <StatCard
                title="储存点"
                value={stats.depotCount}
                icon="🏠"
                color="#8c8c8c"
              />
              <StatCard
                title="低库存预警"
                value={stats.lowStockCount}
                icon="⚠️"
                color={stats.lowStockCount > 0 ? "#ff4d4f" : "#52c41a"}
              />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>快捷操作</Text>
            <View style={styles.actionsGrid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.title}
                  style={[styles.actionCard, { borderLeftColor: action.color }]}
                  onPress={() => router.push(action.href as any)}
                >
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>abacusflow ©2025</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16 },
  loadingBox: { paddingVertical: 60, alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
    paddingTop: 8,
  },
  greeting: { fontSize: 14, color: "#999" },
  appName: { fontSize: 28, fontWeight: "700", color: "#333", marginTop: 4 },
  version: { fontSize: 12, color: "#ccc" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "47%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: { fontSize: 24, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: "700" },
  statTitle: { fontSize: 12, color: "#999", marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  actionsGrid: { gap: 12, marginBottom: 24 },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: { fontSize: 24 },
  actionTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  footer: { alignItems: "center", paddingVertical: 24 },
  footerText: { fontSize: 12, color: "#ccc" },
});
