// src/navigation/MapNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Colors from "../theme/color";

// Pantallas del mapa
import MapMainScreen from "../screens/map/MapMainScreen";
import MapSearchScreen from "../screens/map/MapSearchScreen";
import MapFiltersScreen from "../screens/map/MapFiltersScreen";
import MapListScreen from "../screens/map/MapListScreen";

const Stack = createNativeStackNavigator();

export default function MapNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Stack.Screen 
        name="MapMain" 
        component={MapMainScreen}
        options={{ animation: "fade" }}
      />
      <Stack.Screen 
        name="MapSearch" 
        component={MapSearchScreen} 
      />
      <Stack.Screen 
        name="MapFilters" 
        component={MapFiltersScreen}
        options={{ presentation: "modal" }}
      />
      <Stack.Screen 
        name="MapList" 
        component={MapListScreen} 
      />
    </Stack.Navigator>
  );
}