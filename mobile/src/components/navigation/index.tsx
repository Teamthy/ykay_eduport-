import React from "react";
import { View, TouchableOpacity, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/theme";
import { YkayLogo } from "@/components/YkayLogo";
import { Bell } from "lucide-react-native";

export interface AppHeaderProps {
  showLogo?: boolean;
  title?: string;
  onBellPress?: () => void;
  right?: React.ReactNode;
  style?: ViewStyle;
}

/** Reusable screen header: brand logo + optional bell / custom right node. */
export function AppHeader({ showLogo = true, title, onBellPress, right, style }: AppHeaderProps) {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg, marginTop: spacing.lg, ...style }}>
      {showLogo ? <YkayLogo size={34} textSize={16} /> : <View />}
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        {right}
        {onBellPress && (
          <TouchableOpacity onPress={onBellPress} style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.background.elevated, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: colors.border.subtle }}>
            <Bell size={20} color={colors.brand.greenLight} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
