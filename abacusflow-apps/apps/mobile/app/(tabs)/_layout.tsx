import { Tabs } from "expo-router";
import React from "react";
import { Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1677ff",
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "首页",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "产品",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "库存",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📦</Text>,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "订单",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💱</Text>,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "更多",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⋯</Text>,
        }}
      />
      <Tabs.Screen name="depots" options={{ href: null }} />
    </Tabs>
  );
}
