import { Platform } from "react-native";

let SecureStore: typeof import("expo-secure-store") | null = null;

if (Platform.OS !== "web") {
  SecureStore = require("expo-secure-store");
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (SecureStore) {
    return SecureStore.getItemAsync(key);
  }
  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(key);
  }
  return null;
}

export async function setItemAsync(
  key: string,
  value: string,
): Promise<void> {
  if (SecureStore) {
    return SecureStore.setItemAsync(key, value);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (SecureStore) {
    return SecureStore.deleteItemAsync(key);
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
  }
}
