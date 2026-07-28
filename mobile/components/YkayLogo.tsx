import { View, Text, Image } from "react-native";
import { theme } from "@/lib/theme";

/**
 * Reusable Ykay College brand mark — logo image + wordmark.
 * Uses assets/icon.png (replace with the designer's final logo anytime).
 */
export function YkayLogo({
  size = 42,
  showText = true,
  textSize = 18,
}: {
  size?: number;
  showText?: boolean;
  textSize?: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Image
        source={require("../assets/icon.png")}
        style={{ width: size, height: size, borderRadius: size * 0.26 }}
      />
      {showText && (
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: textSize,
            fontWeight: "800",
            letterSpacing: 0.3,
          }}
          allowFontScaling={false}
        >
          Ykay College
        </Text>
      )}
    </View>
  );
}

/** Compact crest only (no wordmark) — good for headers. */
export function YkayCrest({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={require("../assets/icon.png")}
      style={{ width: size, height: size, borderRadius: size * 0.26 }}
    />
  );
}
