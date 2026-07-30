import React, { useEffect, useRef } from "react";
import { View, Text, ActivityIndicator, TouchableOpacity, Animated, ViewStyle } from "react-native";
import { useTheme } from "@/src/theme";

export function EmptyState({ icon, title, message }: { icon?: React.ReactNode; title: string; message?: string }) {
  const { typography, colors, spacing } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: spacing.xxl }}>
      {icon && <View style={{ marginBottom: spacing.sm }}>{icon}</View>}
      <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.body, fontWeight: typography.fontWeight.semibold, color: colors.text.muted }}>{title}</Text>
      {message && <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.caption, color: colors.text.muted, textAlign: "center", marginTop: 6 }}>{message}</Text>}
    </View>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background.primary }}>
      <ActivityIndicator size="large" color={colors.brand.greenLight} />
      <Text style={{ color: colors.text.primary, fontFamily: typography.fontFamily.body, marginTop: spacing.md }}>{label}</Text>
    </View>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  const { typography, colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background.primary, padding: spacing.lg }}>
      <Text style={{ fontFamily: typography.fontFamily.display, fontSize: typography.fontSize.h3, color: colors.danger }}>{title}</Text>
      {message && <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.body, color: colors.text.secondary, textAlign: "center", marginTop: spacing.sm }}>{message}</Text>}
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={{ marginTop: spacing.lg, backgroundColor: colors.brand.green, paddingVertical: 14, paddingHorizontal: spacing.lg, borderRadius: 12 }}>
          <Text style={{ color: colors.brand.white, fontWeight: "700" }}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function Skeleton({ width = "100%", height = 16, radius = 8, style }: { width?: number | string; height?: number; radius?: number; style?: ViewStyle }) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={{ width, height, borderRadius: radius, backgroundColor: colors.surface.disabled, opacity, ...style }} />;
}
