import React from "react";
import { View, ScrollView, ViewStyle } from "react-native";
import { useTheme } from "@/src/theme";

/** Full screen wrapper with the brand background. */
export function Screen({ children, scroll = true, style, padding }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle; padding?: number }) {
  const { colors, spacing } = useTheme();
  const content = (
    <View style={{ flex: 1, backgroundColor: colors.background.primary, padding: padding ?? spacing.lg, paddingTop: 56, ...style }}>
      {children}
    </View>
  );
  if (scroll) return <ScrollView style={{ flex: 1, backgroundColor: colors.background.primary }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">{content}</ScrollView>;
  return content;
}

export function Container({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={{ width: "100%", ...style }}>{children}</View>;
}

export function Section({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { spacing } = useTheme();
  return <View style={{ marginBottom: spacing.lg, ...style }}>{children}</View>;
}

export function Row({ children, gap = 8, align = "center", justify = "flex-start", style }: { children: React.ReactNode; gap?: number; align?: "flex-start" | "center" | "flex-end"; justify?: "flex-start" | "center" | "flex-end" | "space-between"; style?: ViewStyle }) {
  return <View style={{ flexDirection: "row", alignItems: align, justifyContent: justify, gap, ...style }}>{children}</View>;
}

export function Column({ children, gap = 8, align = "stretch", style }: { children: React.ReactNode; gap?: number; align?: "flex-start" | "center" | "stretch"; style?: ViewStyle }) {
  return <View style={{ flexDirection: "column", gap, alignItems: align, ...style }}>{children}</View>;
}

export function Spacer({ size = 16 }: { size?: number }) {
  return <View style={{ width: size, height: size }} />;
}

export function Divider({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();
  return <View style={{ height: 1, width: "100%", backgroundColor: colors.border.subtle, ...style }} />;
}
