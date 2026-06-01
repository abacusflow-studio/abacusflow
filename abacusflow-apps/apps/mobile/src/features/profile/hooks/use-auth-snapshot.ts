import { useState, useEffect } from "react";
import { getAuthClient } from "@abacusflow/core";
import {
  getMobileAuthSnapshot,
  subscribeMobileAuth,
  type MobileAuthSnapshot,
} from "@features/auth/services/auth-service";

/**
 * 认证状态订阅 hook
 * 封装 auth snapshot 的订阅和登出操作
 */
export function useAuthSnapshot() {
  const [authSnapshot, setAuthSnapshot] = useState<MobileAuthSnapshot>(
    getMobileAuthSnapshot(),
  );

  useEffect(() => {
    return subscribeMobileAuth(setAuthSnapshot);
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuthClient();
      await auth.logout();
    } catch (err) {
      console.error(err);
    }
  };

  const displayName =
    authSnapshot.user?.nickname || authSnapshot.user?.name || "未登录";
  const displayEmail = authSnapshot.user?.email ?? "";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return {
    authSnapshot,
    displayName,
    displayEmail,
    avatarLetter,
    handleLogout,
  };
}
