"use client";

import { getGreetingMessage } from "@abacusflow/core";
import { Alert, Text, View } from "react-native";
import { Button } from "./Button";

export const Greeting = () => {
  const message = getGreetingMessage();

  const handlePress = () => {
    Alert.alert("Shared UI", "Shared UI button clicked!");
  };

  return (
    <View style={{ padding: 16, backgroundColor: "#f0f0f0", borderRadius: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
        {message}
      </Text>
      <Button onClick={handlePress} label="Click Me (Shared Button)" />
    </View>
  );
};
