import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const MENU_SECTIONS = [
  {
    title: "合作伙伴",
    items: [
      { href: "/(tabs)/more", label: "客户管理", icon: "👤", action: "customer" },
      { href: "/(tabs)/more", label: "供应商管理", icon: "🏪", action: "supplier" },
    ],
  },
  {
    title: "仓储管理",
    items: [
      { href: "/(tabs)/depots", label: "储存点管理", icon: "🏠", action: "depot" },
    ],
  },
  {
    title: "系统",
    items: [
      { href: "/(tabs)/more", label: "用户管理", icon: "⚙️", action: "user" },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();

  const handleAction = (action: string) => {
    switch (action) {
      case "customer":
        router.push("/partner/customer");
        break;
      case "supplier":
        router.push("/partner/supplier");
        break;
      case "depot":
        router.push("/(tabs)/depots");
        break;
      case "user":
        router.push("/user");
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.action}
                  style={[styles.menuItem, idx < section.items.length - 1 && styles.menuItemBorder]}
                  onPress={() => handleAction(item.action)}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuArrow}>›</Text>
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
  sectionTitle: { fontSize: 13, color: "#999", marginBottom: 8, paddingLeft: 4 },
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
  menuItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#f0f0f0" },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: "#333" },
  menuArrow: { fontSize: 20, color: "#ccc" },
});
