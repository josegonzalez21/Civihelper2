// src/components/common/PickerField.js
import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from "react-native";
import Input from "./Input";
import Colors, { spacing, radius, shadows } from "../../theme/color";

function normalizeOptions(src = []) {
  if (!Array.isArray(src)) return [];
  return src
    .map((it) => {
      // Acepta {id,name} | {value,label} | {_id,title}...
      const value =
        it?.value ?? it?.id ?? it?._id ?? it?.uuid ?? it?.key ?? null;
      const label = String(
        it?.label ?? it?.name ?? it?.title ?? it?.text ?? it?.display ?? ""
      ).trim();
      if (value == null) return null;
      return { label, value, _raw: it };
    })
    .filter(Boolean);
}

export default function PickerField({
  label,
  value,
  items,             // preferido
  options,           // compat
  onValueChange,     // preferido
  onChange,          // compat
  placeholder = "Selecciona...",
  loading = false,
  error,
  disabled = false,
  searchable = true, // activa buscador dentro del modal
  containerStyle,
  triggerInputStyle,
  listHeight = 320,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const data = useMemo(
    () => normalizeOptions(items ?? options ?? []),
    [items, options]
  );

  // Soporta value como primitivo (id) o como objeto {label,value}
  const selected = useMemo(() => {
    if (!value && value !== 0) return null;
    if (typeof value === "object") {
      const v = value?.value ?? value?.id ?? value?._id ?? null;
      if (v == null) return null;
      return (
        data.find((d) => String(d.value) === String(v)) || {
          label: value?.label ?? String(v),
          value: v,
        }
      );
    }
    return data.find((d) => String(d.value) === String(value)) || null;
  }, [value, data]);

  const selectedLabel = selected?.label ?? (typeof value === "string" ? value : "");

  const shown = useMemo(() => {
    const q = String(query || "").toLowerCase().trim();
    if (!q) return data;
    return data.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        String(it.value).toLowerCase().includes(q)
    );
  }, [data, query]);

  const commitChange = (item) => {
    // Llama ambos por compatibilidad
    onValueChange?.(String(item?.value));
    onChange?.(item);
  };

  return (
    <>
      <View style={[{ marginBottom: spacing?.md ?? 12 }, containerStyle]}>
        <Input
          label={label}
          value={selectedLabel || ""}
          placeholder={placeholder}
          editable={false}
          onPressIn={() => !disabled && setOpen(true)}
          rightIcon={
            <Text style={{ color: Colors?.sub || "#6b7280", fontSize: 16 }}>
              ▼
            </Text>
          }
          style={triggerInputStyle}
          error={error}
        />
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.backdrop}>
          <View style={[s.sheet, { maxHeight: listHeight }]}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{label || "Selecciona una opción"}</Text>
              <TouchableOpacity
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                style={s.closeBtn}
              >
                <Text style={s.closeText}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            {searchable && (
              <Input
                placeholder="Buscar..."
                value={query}
                onChangeText={setQuery}
                containerStyle={{ marginBottom: spacing?.sm ?? 8 }}
                rightIcon={<Text style={{ color: Colors?.sub }}>⌕</Text>}
              />
            )}

            {loading ? (
              <View style={s.center}>
                <ActivityIndicator color={Colors?.primary || "#7C3AED"} />
                <Text style={s.helper}>Cargando...</Text>
              </View>
            ) : shown.length === 0 ? (
              <View style={s.center}>
                <Text style={s.helper}>
                  {data.length === 0
                    ? "No hay opciones disponibles."
                    : "Sin resultados para tu búsqueda."}
                </Text>
                {data.length === 0 && (
                  <TouchableOpacity
                    onPress={() => setOpen(false)}
                    style={[s.primaryBtn]}
                  >
                    <Text style={s.primaryBtnText}>Entendido</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <FlatList
                data={shown}
                keyExtractor={(it) => String(it.value)}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => {
                  const isSelected =
                    selected && String(selected.value) === String(item.value);
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        commitChange(item);
                        setOpen(false);
                      }}
                      style={[s.row, isSelected && s.rowSelected]}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[s.rowText, isSelected && s.rowTextSelected]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={s.sep} />}
                contentContainerStyle={{ paddingBottom: spacing?.sm ?? 8 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors?.overlay || "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing?.lg ?? 16,
  },
  sheet: {
    width: "100%",
    backgroundColor: Colors?.card || "#fff",
    borderRadius: radius?.lg ?? 22,
    padding: spacing?.md ?? 12,
    ...((shadows && shadows.lg) ||
      (Platform.OS === "android"
        ? { elevation: 5 }
        : {
            shadowColor: "#000",
            shadowOpacity: 0.16,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          })),
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing?.sm ?? 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors?.text || "#0F172A",
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: Colors?.bg2
      ? Colors.bg2
      : "rgba(0,0,0,0.06)",
  },
  closeText: {
    color: Colors?.text || "#0F172A",
    fontSize: 12,
    opacity: 0.8,
  },
  center: {
    alignItems: "center",
    paddingVertical: spacing?.lg ?? 16,
    gap: 6,
  },
  helper: {
    color: Colors?.sub || "#6b7280",
    fontSize: 13,
  },
  row: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Colors?.card || "#fff",
    borderRadius: radius?.sm ?? 12,
  },
  rowSelected: {
    backgroundColor:
      Colors?.withOpacity?.(Colors?.primary || "#7C3AED", 0.12) ||
      "rgba(124,58,237,0.12)",
  },
  rowText: {
    color: Colors?.text || "#0F172A",
    fontSize: 15,
  },
  rowTextSelected: {
    fontWeight: "700",
  },
  sep: {
    height: 8,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: Colors?.primary || "#7C3AED",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius?.md ?? 16,
  },
  primaryBtnText: {
    color: Colors?.contrastText?.(Colors?.primary || "#7C3AED") || "#fff",
    fontWeight: "700",
  },
});

