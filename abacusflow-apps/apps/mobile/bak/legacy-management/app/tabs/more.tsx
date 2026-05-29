import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const MENU_SECTIONS = [
  {
    title: "数据管理",
    items: [
      {
        label: "产品列表",
        icon: "cube-outline" as const,
        color: "#1677ff",
        route: "/(tabs)/products" as any,
      },
      {
        label: "采购单",
        icon: "download-outline" as const,
        color: "#fa8c16",
        route: "/order/purchase/add" as any,
      },
      {
        label: "销售单",
        icon: "arrow-up-outline" as const,
        color: "#722ed1",
        route: "/order/sale/add" as any,
      },
    ],
  },
  {
    title: "合作伙伴",
    items: [
      {
        label: "客户管理",
        icon: "person-outline" as const,
        color: "#13c2c2",
        route: "/partner/customer" as any,
      },
      {
        label: "供应商管理",
        icon: "storefront-outline" as const,
        color: "#eb2f96",
        route: "/partner/supplier" as any,
      },
    ],
  },
  {
    title: "仓储管理",
    items: [
      {
        label: "储存点管理",
        icon: "location-outline" as const,
        color: "#8c8c8c",
        route: "/(tabs)/depots" as any,
      },
    ],
  },
  {
    title: "系统管理",
    items: [
      {
        label: "用户管理",
        icon: "people-outline" as const,
        color: "#595959",
        route: "/user/index" as any,
      },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => router.push(item.route)}
                >
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: item.color + "15" },
                    ]}
                  >
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  content: { padding: 16 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    color: "#999",
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f0f0f0",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuLabel: { flex: 1, fontSize: 15, color: "#333" },
});
