// src/components/common/PrimaryButton.js
import React from "react";
import { TouchableOpacity, ActivityIndicator, Text, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const Colors = {
  primary: "#1E88E5",
  success: "#43A047",
  textOnPrimary: "#fff",
  border: "#E5E7EB",
};

export default function PrimaryButton({
  children,
  onPress,
  disabled = false,
  loading = false,
  leftIcon = null,
  rightIcon = null,
  colors = [Colors.primary, Colors.success],
  style,
  textStyle,
  accessibilityLabel,
  small = false,
}) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.wrapper, small && styles.wrapperSm, isDisabled && { opacity: 0.6 }, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === "string" ? children : "Botón")}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, small && styles.gradientSm]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        {loading ? (
          <ActivityIndicator color={Colors.textOnPrimary} />
        ) : (
          <Text style={[styles.text, small && styles.textSm, textStyle]} numberOfLines={1}>
            {children}
          </Text>
        )}

        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: 12, overflow: "hidden" },
  wrapperSm: { borderRadius: 10 },
  gradient: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  gradientSm: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  text: { color: Colors.textOnPrimary, fontWeight: "800", fontSize: 16 },
  textSm: { fontSize: 14 },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});
