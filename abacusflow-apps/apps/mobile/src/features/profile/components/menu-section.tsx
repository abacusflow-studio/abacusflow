import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@abacusflow/utils";
import type { MenuSection as MenuSectionType } from "../types";

interface Props {
  section: MenuSectionType;
  onItemPress: (route: string) => void;
}

/** 菜单分区 */
export function MenuSection({ section, onItemPress }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionCard}>
        {section.items.map((item, idx) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              idx < section.items.length - 1 && styles.menuItemBorder,
            ]}
            onPress={() => onItemPress(item.route)}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={COLORS.textSecondary}
            />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={COLORS.textDisabled}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  menuLabel: { flex: 1, fontSize: 15, color: COLORS.text },
});
