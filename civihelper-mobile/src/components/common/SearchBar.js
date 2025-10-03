// src/components/common/SearchBar.js
import React, { useEffect, useMemo } from "react";
import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors, { spacing, radius, shadows } from "../../theme/color";
import useDebounce from "../../hooks/useDebounce";

/**
 * SearchBar
 * - Controlado por `value` y `onChangeText`.
 * - Opcionalmente dispara `onDebouncedChange` tras `debounceMs` ms.
 *
 * Props:
 *  - value: string
 *  - onChangeText: (text) => void
 *  - onDebouncedChange?: (text) => void
 *  - debounceMs?: number (default 400)
 *  - placeholder?: string
 *  - autoFocus?: boolean
 *  - loading?: boolean           // muestra spinner al lado derecho
 *  - onClear?: () => void        // si no se pasa, limpia con onChangeText("")
 *  - style?: ViewStyle           // estilo del contenedor
 *  - inputStyle?: TextStyle      // estilo del TextInput
 *  - testID?: string
 */
function SearchBar({
  value,
  onChangeText,
  onDebouncedChange,
  debounceMs = 400,
  placeholder = "Buscar…",
  autoFocus = false,
  loading = false,
  onClear,
  style,
  inputStyle,
  testID = "search-bar",
  ...inputProps
}) {
  const debounced = useDebounce(value, debounceMs);

  useEffect(() => {
    if (typeof onDebouncedChange === "function") {
      onDebouncedChange(debounced);
    }
  }, [debounced, onDebouncedChange]);

  const showClear = useMemo(() => !!value && !loading, [value, loading]);

  function handleClear() {
    if (onClear) return onClear();
    onChangeText?.("");
  }

  return (
    <View style={[styles.wrap, style]} testID={testID} accessibilityLabel="Barra de búsqueda">
      <Feather name="search" size={18} color={Colors.subtext} style={styles.leftIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.subtext}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        style={[styles.input, inputStyle]}
        selectionColor={Colors.primary}
        returnKeyType="search"
        {...inputProps}
      />
      {loading ? (
        <ActivityIndicator style={styles.rightSlot} />
      ) : showClear ? (
        <TouchableOpacity
          onPress={handleClear}
          style={[styles.rightSlot, styles.clearButton]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
        >
          <Feather name="x" size={16} color="#0F172A" />
        </TouchableOpacity>
      ) : (
        <View style={styles.rightSlot} />
      )}
    </View>
  );
}

export default React.memo(SearchBar);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 48,
    ...shadows.sm,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
  },
  rightSlot: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
  clearButton: {
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 14,
  },
});
