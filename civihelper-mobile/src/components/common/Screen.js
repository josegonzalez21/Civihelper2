// src/components/common/Screen.js
import React from "react";
import { SafeAreaView, View, ScrollView, RefreshControl, ActivityIndicator, StyleSheet } from "react-native";
import Colors from "../../theme/color";

export default function Screen({ loading, error, onRetry, onRefresh, children, scroll = true }) {
  const Container = scroll ? ScrollView : View;
  const props = scroll ? { refreshControl: onRefresh && <RefreshControl refreshing={!!loading && false} onRefresh={onRefresh} /> } : {};
  return (
    <SafeAreaView style={{ flex:1, backgroundColor: Colors.bg }}>
      <Container style={s.body} {...props}>
        {loading ? <ActivityIndicator style={{ marginTop: 32 }} /> :
         error ? <ErrorView message={error} onRetry={onRetry} /> :
         children}
      </Container>
    </SafeAreaView>
  );
}
function ErrorView({ message, onRetry }) {
  return <View style={{ alignItems:"center", padding:24 }}>
    <Text style={{ color: Colors.danger, marginBottom: 12 }}>{message}</Text>
    {onRetry && <PrimaryButton onPress={onRetry}>Reintentar</PrimaryButton>}
  </View>;
}
const s = StyleSheet.create({ body:{ flex:1, padding:16 }});
