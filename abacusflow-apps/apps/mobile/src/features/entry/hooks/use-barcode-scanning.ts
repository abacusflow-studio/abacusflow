import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { SelectableProduct } from "@abacusflow/core";

/**
 * 条码扫描 hook
 * 封装扫描状态管理 + 产品查找 + "未找到"提示
 */
export function useBarcodeScanning(products: SelectableProduct[]) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);

  /** 扫码回调：查找产品，未找到则提示建档 */
  const handleScan = useCallback(
    (
      barcode: string,
      onFound: (product: SelectableProduct) => void,
      returnTo: string,
    ) => {
      setScanning(false);
      const product = products.find((p) => p.barcode === barcode);
      if (product) {
        onFound(product);
      } else {
        Alert.alert("条码未录入", "该产品不存在，是否先建档？", [
          { text: "取消", style: "cancel" },
          {
            text: "建档",
            onPress: () =>
              router.push({
                pathname: "/entry/product",
                params: { barcode, returnTo },
              } as any),
          },
        ]);
      }
    },
    [products, router],
  );

  /** 检查产品是否已在明细中 */
  const isDuplicate = useCallback(
    (productId: number, existingIds: number[]) => {
      if (existingIds.includes(productId)) {
        Alert.alert("提示", "该产品已在明细中");
        return true;
      }
      return false;
    },
    [],
  );

  return {
    scanning,
    setScanning,
    handleScan,
    isDuplicate,
  };
}
