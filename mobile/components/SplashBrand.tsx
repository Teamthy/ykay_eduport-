import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/src/theme/colors";
import { Gradients } from "@/src/theme/gradients";
import { YkayLogo } from "@/components/YkayLogo";

/**
 * Branded launch state.
 *
 * Replaces the bare ActivityIndicator that used to show while the session
 * resolves. Same job, but the first thing a user sees is the Ykay mark on the
 * brand gradient rather than a grey spinner.
 */
export function SplashBrand({ tagline = "Loading your portal…" }: { tagline?: string }) {
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(12)).current;
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fade, lift, pulse]);

  return (
    <LinearGradient colors={[...Gradients.hero]} style={{ flex: 1 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: lift }] }}>
          <YkayLogo size={72} textSize={22} />
        </Animated.View>

        <Animated.Text
          style={{
            opacity: pulse,
            color: Colors.text.muted,
            fontFamily: "DM Sans",
            fontSize: 13,
            marginTop: 28,
            letterSpacing: 0.3,
          }}
        >
          {tagline}
        </Animated.Text>
      </View>

      <Animated.Text
        style={{
          opacity: fade,
          textAlign: "center",
          color: Colors.text.muted,
          fontFamily: "DM Sans",
          fontSize: 11,
          paddingBottom: 34,
        }}
      >
        Ykay College &amp; Leadership Academy
      </Animated.Text>
    </LinearGradient>
  );
}
