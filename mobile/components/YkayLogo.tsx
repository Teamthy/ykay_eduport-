import { View, Text, Image } from "react-native";
import { Colors } from "@/src/theme/colors";

/**
 * Reusable Ykay College brand mark — logo image + wordmark.
 * Uses assets/icon.png (replace with the designer's final logo anytime).
 */
export function YkayLogo({ size = 42, showText = true, textSize = 18 }: { size?: number; showText?: boolean; textSize?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Image source={require("../assets/icon.png")} style={{ width: size, height: size, borderRadius: size * 0.26 }} />
      {showText && (
        <Text style={{ color: Colors.text.primary, fontSize: textSize, fontWeight: "800", letterSpacing: 0.3, fontFamily: "Anton" }} allowFontScaling={false}>
          Ykay College
        </Text>
      )}
    </View>
  );
}

export function YkayCrest({ size = 32 }: { size?: number }) {
  return <Image source={require("../assets/icon.png")} style={{ width: size, height: size, borderRadius: size * 0.26 }} />;
}
