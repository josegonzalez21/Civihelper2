// App.js
import 'react-native-reanimated';
import 'react-native-gesture-handler';

import React, { useEffect, useMemo } from 'react';
import { LogBox, Platform, useColorScheme } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { enableScreens } from 'react-native-screens';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import {
  installGlobalErrorHandlers,
  setErrorReporter,
  setSanitizer,
} from './src/utils/setupErrorHandling';

import Colors from './src/theme/color';

enableScreens(true);

export default function App() {
  const scheme = useColorScheme();

  const navTheme = useMemo(() => {
    const base = scheme === 'light' ? DefaultTheme : DarkTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: Colors?.bg ?? '#0B0A2A',
        card: Colors?.bg2 ?? '#140A2E',
        text: Colors?.text ?? '#FFFFFF',
        border: Colors?.border ?? 'rgba(255,255,255,0.08)',
        primary: Colors?.primary ?? '#7C3AED',
        notification: Colors?.error ?? '#EF4444',
      },
    };
  }, [scheme]);

  useEffect(() => {
    setSanitizer((payload) => {
      const p = { ...payload };
      if (!__DEV__ && p?.error) p.error.stack = undefined;
      if (p?.request?.headers?.Authorization) {
        p.request.headers.Authorization = 'Bearer ***';
      }
      return p;
    });

    setErrorReporter(async (_payload) => {
      // await fetch('https://tu-backend/logs', { method: 'POST', body: JSON.stringify(_payload) })
    });

    installGlobalErrorHandlers({
      tapConsole: false,
      enableNetworkInterceptor: __DEV__,
      fetchExcludeDomains: ['localhost', '10.0.2.2', '192.168.', '127.0.0.1'],
      showAlerts: true,
      ignoreLogBox: [
        'Non-serializable values were found in the navigation state',
        'Require cycle:',
      ],
    });

    LogBox.ignoreLogs([
      'Non-serializable values were found in the navigation state',
      'Require cycle:',
    ]);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors?.bg ?? '#0B0A2A' }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer theme={navTheme}>
            <StatusBar
              style="light"
              translucent={Platform.OS === 'android'}
              backgroundColor={Platform.OS === 'android' ? 'transparent' : undefined}
            />
            <AppNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}