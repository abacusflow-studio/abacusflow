import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AuthGate } from "@/components/auth-gate";
import { useColorScheme } from "@abacusflow/ui-native";
import { initMobileAuth } from "@/lib/auth-provider";

// Initialize auth on app start
initMobileAuth();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthGate>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="oauth/callback"
            options={{ headerShown: false }}
          />
          {/* Entry flows */}
          <Stack.Screen
            name="entry/purchase"
            options={{ title: "入库" }}
          />
          <Stack.Screen
            name="entry/sale"
            options={{ title: "出库" }}
          />
          <Stack.Screen
            name="entry/product"
            options={{ title: "新品建档" }}
          />
          <Stack.Screen
            name="scan/index"
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
          {/* Legacy routes - kept for backward compat */}
          <Stack.Screen name="product/[id]" options={{ title: "产品详情" }} />
          <Stack.Screen name="product/add" options={{ title: "新增产品" }} />
          <Stack.Screen
            name="product/edit/[id]"
            options={{ title: "编辑产品" }}
          />
          <Stack.Screen name="depot/[id]" options={{ title: "储存点详情" }} />
          <Stack.Screen name="depot/add" options={{ title: "新增储存点" }} />
          <Stack.Screen
            name="depot/edit/[id]"
            options={{ title: "编辑储存点" }}
          />
          <Stack.Screen name="inventory/[id]" options={{ title: "库存详情" }} />
          <Stack.Screen
            name="order/purchase/[id]"
            options={{ title: "采购单详情" }}
          />
          <Stack.Screen
            name="order/sale/[id]"
            options={{ title: "销售单详情" }}
          />
          <Stack.Screen
            name="order/purchase/add"
            options={{ title: "入库" }}
          />
          <Stack.Screen
            name="order/sale/add"
            options={{ title: "出库" }}
          />
          <Stack.Screen
            name="partner/customer/index"
            options={{ title: "客户资料" }}
          />
          <Stack.Screen
            name="partner/customer/[id]"
            options={{ title: "客户详情" }}
          />
          <Stack.Screen
            name="partner/customer/add"
            options={{ title: "新增客户" }}
          />
          <Stack.Screen
            name="partner/customer/edit/[id]"
            options={{ title: "编辑客户" }}
          />
          <Stack.Screen
            name="partner/supplier/index"
            options={{ title: "供应商资料" }}
          />
          <Stack.Screen
            name="partner/supplier/[id]"
            options={{ title: "供应商详情" }}
          />
          <Stack.Screen
            name="partner/supplier/add"
            options={{ title: "新增供应商" }}
          />
          <Stack.Screen
            name="partner/supplier/edit/[id]"
            options={{ title: "编辑供应商" }}
          />
          <Stack.Screen name="user/index" options={{ title: "账号与权限" }} />
          <Stack.Screen name="feedback/index" options={{ title: "问题反馈" }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthGate>
    </ThemeProvider>
  );
}
