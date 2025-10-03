// src/components/common/AppHeader.js
import { LinearGradient } from "expo-linear-gradient";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors, { spacing } from "../../theme/color";

export default function AppHeader({ title, subtitle, onBack, right }) {
  return (
    <LinearGradient colors={[Colors.primary, Colors.primarySoft]} style={s.wrap}>
      <View style={s.row}>
        {onBack ? (
          <TouchableOpacity accessibilityLabel="Volver" onPress={onBack} style={s.iconBtn}>
            <Feather name="chevron-left" size={24} color="#0F172A" />
          </TouchableOpacity>
        ) : <View style={s.iconBtn} />}
        <View style={s.center}>
          <Text style={s.title}>{title}</Text>
          {!!subtitle && <Text style={s.sub}>{subtitle}</Text>}
        </View>
        <View style={s.right}>{right}</View>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  wrap:{ paddingTop: Platform.OS==="ios"? spacing.xl : spacing.lg, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
  row:{ flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  iconBtn:{ width:40, height:40, alignItems:"center", justifyContent:"center", borderRadius:10, backgroundColor:"rgba(255,255,255,0.6)"},
  center:{ flex:1, alignItems:"center" },
  title:{ fontSize:20, fontWeight:"700", color:"#0F172A" },
  sub:{ marginTop:4, color:"#334155" },
  right:{ width:40, alignItems:"flex-end" }
});
