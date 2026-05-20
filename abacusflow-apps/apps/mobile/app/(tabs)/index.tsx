import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

const MENU_ITEMS = [
  { href: "/(tabs)/products", title: "产品管理", icon: "📋", desc: "查看和管理产品信息" },
  { href: "/(tabs)/inventory", title: "库存管理", icon: "📦", desc: "查看库存状态和预警" },
  { href: "/(tabs)/orders", title: "订单管理", icon: "💱", desc: "采购单和销售单" },
  { href: "/(tabs)/depots", title: "储存点", icon: "🏠", desc: "管理仓库和储存点" },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>🧮</Text>
          <Text style={styles.title}>小算盘</Text>
          <Text style={styles.subtitle}>AbacusFlow 移动端</Text>
        </View>

        <View style={styles.grid}>
          {MENU_ITEMS.map((item) => (
            <Link key={item.href} href={item.href as any} asChild>
              <TouchableOpacity style={styles.card}>
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </TouchableOpacity>
            </Link>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>abacusflow ©2025</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    paddingVertical: 32,
  },
  logo: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "48%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: "#999",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: "#ccc",
  },
});
