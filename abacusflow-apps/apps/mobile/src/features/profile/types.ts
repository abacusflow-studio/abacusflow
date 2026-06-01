import type { Ionicons } from "@expo/vector-icons";

/** 用户档案 */
export interface UserProfile {
  displayName: string;
  displayEmail: string;
  avatarLetter: string;
  isAuthenticated: boolean;
}

/** 菜单项 */
export interface MenuItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

/** 菜单分区 */
export interface MenuSection {
  title: string;
  items: MenuItem[];
}
