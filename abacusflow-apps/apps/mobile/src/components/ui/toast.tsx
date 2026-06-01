import { useEffect, useRef } from "react";
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";

interface ToastProps {
  visible: boolean;
  message: string;
  type: "error" | "success" | "info";
  onHide: () => void;
}

const ICON_MAP = {
  error: "alert-circle",
  success: "checkmark-circle",
  info: "information-circle",
} as const;

const COLOR_MAP = {
  error: COLORS.danger,
  success: COLORS.success,
  info: COLORS.primary,
} as const;

const BG_MAP = {
  error: "#FEF2F2",
  success: "#F0FDF4",
  info: "#EFF6FF",
} as const;

/** 全局 Toast 组件 */
export function Toast({ visible, message, type, onHide }: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: BG_MAP[type],
          borderLeftColor: COLOR_MAP[type],
        },
      ]}
    >
      <Ionicons
        name={ICON_MAP[type]}
        size={20}
        color={COLOR_MAP[type]}
        style={styles.icon}
      />
      <Text style={styles.message} numberOfLines={3}>
        {message}
      </Text>
      <TouchableOpacity onPress={onHide} style={styles.closeBtn}>
        <Ionicons name="close" size={18} color={COLORS.textTertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 9999,
  },
  icon: { marginRight: 10 },
  message: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
