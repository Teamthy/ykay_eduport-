import React from "react";
import { View, Text, TextInput, TextInputProps } from "react-native";
import { useTheme } from "@/src/theme";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hint?: string;
}

export function Input({ label, error, leftIcon, rightIcon, hint, ...rest }: InputProps) {
  const { colors, radius, typography, spacing } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      {label && <Text style={{ fontFamily: typography.body, fontSize: typography.fontSize.label, fontWeight: typography.fontWeight.medium, color: colors.text.primary, textTransform: "uppercase", letterSpacing: typography.letterSpacing.wide }}>{label}</Text>}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          backgroundColor: colors.surface.input,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: error ? colors.border.error : colors.border.default,
        }}
      >
        {leftIcon}
        <TextInput
          placeholderTextColor={colors.text.disabled}
          style={{ flex: 1, color: colors.text.primary, paddingVertical: 14, fontSize: typography.fontSize.body, fontFamily: typography.body }}
          {...rest}
        />
        {rightIcon}
      </View>
      {error ? (
        <Text style={{ color: colors.danger, fontSize: typography.fontSize.caption, fontFamily: typography.body }}>{error}</Text>
      ) : hint ? (
        <Text style={{ color: colors.text.muted, fontSize: typography.fontSize.caption, fontFamily: typography.body }}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function TextArea({ label, error, ...rest }: InputProps) {
  return <Input label={label} error={error} {...rest} multiline numberOfLines={4} textAlignVertical="top" style={{ minHeight: 120 }} />;
}
