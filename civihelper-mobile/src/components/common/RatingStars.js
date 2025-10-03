// src/components/common/RatingStars.js
import React, { Fragment } from "react";
import { View, Text, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";

const Colors = {
  active: "#FBBF24",
  inactive: "#D1D5DB",
  text: "#0F172A",
};

export default function RatingStars({
  rating = 0,
  size = 14,
  count = 5,
  colorActive = Colors.active,
  colorInactive = Colors.inactive,
  showValue = false,
  style,
  valueStyle,
}) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = count - full - (half ? 1 : 0);

  return (
    <View style={[styles.row, style]} accessibilityRole="image" accessibilityLabel={`Rating ${rating} de ${count}`}>
      {[...Array(full)].map((_, i) => (
        <FontAwesome key={`f-${i}`} name="star" size={size} color={colorActive} />
      ))}
      {half && <FontAwesome name="star-half-full" size={size} color={colorActive} />}
      {[...Array(Math.max(0, empty))].map((_, i) => (
        <FontAwesome key={`e-${i}`} name="star-o" size={size} color={colorInactive} />
      ))}
      {showValue && (
        <Fragment>
          <Text style={{ width: 6 }} />
          <Text style={[styles.value, valueStyle]}>{Number(rating || 0).toFixed(1)}</Text>
        </Fragment>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  value: { color: Colors.text, fontWeight: "700", fontSize: 12 },
});
