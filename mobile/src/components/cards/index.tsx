import React from "react";
import { View, ViewStyle } from "react-native";
import { useTheme } from "@/src/theme";

type CardVariant = "default" | "elevated" | "interactive" | "glass" | "bordered";

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: number;
  style?: ViewStyle;
  onPress?: () => void;
}

export function Card({ children, variant = "default", padding = 16, style, onPress }: CardProps) {
  const { colors, radius, shadows } = useTheme();

  const variantStyle: ViewStyle =
    variant === "elevated"
      ? { backgroundColor: colors.background.elevated, ...shadows.card }
      : variant === "glass"
        ? { backgroundColor: "rgba(12,24,36,0.7)" }
        : variant === "bordered"
          ? { backgroundColor: colors.background.elevated, borderWidth: 1, borderColor: colors.border.default }
          : variant === "interactive"
            ? { backgroundColor: colors.background.elevated, borderWidth: 1, borderColor: colors.border.subtle, ...shadows.card }
            : { backgroundColor: colors.background.elevated, borderWidth: 1, borderColor: colors.border.subtle };

  return (
    <View
      style={{
        borderRadius: radius.lg,
        padding,
        ...variantStyle,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
