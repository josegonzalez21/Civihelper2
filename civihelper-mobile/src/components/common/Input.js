// src/components/common/Input.js
import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import Colors, { spacing, radius } from "../../theme/color";

export default function Input({ label, error, style, ...props }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={Colors.subtext}
        style={[s.input, error && s.inputError, style]}
        {...props}
      />
      {!!error && <Text style={s.err}>{error}</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  label:{ marginBottom:6, color: Colors.subtext, fontSize:13 },
  input:{ backgroundColor:"#fff", borderWidth:1, borderColor: Colors.border, borderRadius: radius.md, paddingHorizontal:12, height:48 },
  inputError:{ borderColor: Colors.danger },
  err:{ marginTop:6, color: Colors.danger, fontSize:12 }
});
