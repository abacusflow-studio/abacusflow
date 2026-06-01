import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "@abacusflow/utils";

interface Props {
  displayName: string;
  displayEmail: string;
  avatarLetter: string;
  isAuthenticated: boolean;
}

/** 用户头像+姓名卡片 */
export function UserProfileCard({
  displayName,
  displayEmail,
  avatarLetter,
  isAuthenticated,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{avatarLetter}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{displayName}</Text>
        {displayEmail ? (
          <Text style={styles.hint}>{displayEmail}</Text>
        ) : (
          <Text style={styles.hint}>
            {isAuthenticated ? "已连接" : "未登录"}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
  },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  hint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
