import { useState, useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";

interface ToastState {
  visible: boolean;
  message: string;
  type: "error" | "success" | "info";
}

let globalShowToast:
  | ((message: string, type?: ToastState["type"]) => void)
  | null = null;

/**
 * 全局 Toast hook
 * 用于在任意位置显示错误/成功提示
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "error",
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string, type: ToastState["type"] = "error") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ visible: true, message, type });
      timerRef.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 4000);
    },
    [],
  );

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    globalShowToast = showToast;

    return () => {
      if (globalShowToast === showToast) {
        globalShowToast = null;
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [showToast]);

  return { toast, showToast, hideToast };
}

/** 全局调用 Toast（可在任何地方使用） */
export function showToast(
  message: string,
  type: "error" | "success" | "info" = "error",
) {
  if (globalShowToast) {
    globalShowToast(message, type);
  } else {
    // fallback: 如果 Toast 未初始化，用 Alert
    Alert.alert(type === "error" ? "错误" : "提示", message);
  }
}
