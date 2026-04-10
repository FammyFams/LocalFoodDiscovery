import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform, AppState, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Lora_400Regular, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import { Raleway_400Regular, Raleway_500Medium, Raleway_600SemiBold, Raleway_700Bold } from '@expo-google-fonts/raleway';
import { initAnalytics, trackEvent } from './services/analytics';

import { RestaurantProvider } from './context/RestaurantContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import MainScreen from './screens/MainScreen';
import LikedScreen from './screens/LikedScreen';
import NotNowScreen from './screens/NotNowScreen';
import DetailScreen from './screens/DetailScreen';
import MapPickerScreen from './screens/MapPickerScreen';
import DecisionScreen from './screens/DecisionScreen';
import AccountScreen from './screens/AccountScreen';
import DietPreferencesScreen from './screens/DietPreferencesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>{emoji}</Text>;
}

function TabNavigator() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: t.tabBar,
          borderTopColor: t.separator,
          borderTopWidth: 0.5,
          paddingTop: 6,
          paddingBottom: bottomPad,
          height: 56 + bottomPad,
        },
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textTertiary,
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Raleway_500Medium', marginBottom: Platform.OS === 'ios' ? 0 : 4 },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Discover"
        component={MainScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Liked"
        component={LikedScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="💚" focused={focused} />,
          headerShown: true,
          headerTitle: 'Liked',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: 'Lora_700Bold', fontSize: 17, color: t.text },
        }}
      />
      <Tab.Screen
        name="Not Now"
        component={NotNowScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👋" focused={focused} />,
          headerShown: true,
          headerTitle: 'Passed',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: 'Lora_700Bold', fontSize: 17, color: t.text },
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
          headerShown: true,
          headerTitle: 'Settings',
          headerLargeTitle: true,
          headerStyle: { backgroundColor: t.bg },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: 'Lora_700Bold', fontSize: 17, color: t.text },
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { settings } = useSettings();
  const t = useTheme();
  const isDark = settings.darkMode;

  useEffect(() => {
    let sessionStart = Date.now();
    initAnalytics();
    trackEvent('app_opened');

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sessionStart = Date.now();
        trackEvent('app_foregrounded');
      }
      if (state === 'background') {
        const durationSec = Math.round((Date.now() - sessionStart) / 1000);
        trackEvent('app_backgrounded', { session_duration_seconds: durationSec });
      }
    });
    return () => sub.remove();
  }, []);

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: t.bg, card: t.surface, text: t.text, border: t.separator, primary: t.accent } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: t.bg, card: t.surface, text: t.text, border: t.separator, primary: t.accent } };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="MapPicker"
          component={MapPickerScreen}
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="DietPreferences"
          component={DietPreferencesScreen}
          options={{
            headerShown: true,
            headerTitle: 'Diet Restrictions',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: t.bg },
            headerShadowVisible: false,
            headerTitleStyle: { fontFamily: 'Lora_600SemiBold', fontSize: 17, color: t.text },
            headerTintColor: t.accent,
          }}
        />
        <Stack.Screen
          name="Decision"
          component={DecisionScreen}
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
      </Stack.Navigator>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    Lora_600SemiBold,
    Lora_700Bold,
    Raleway_400Regular,
    Raleway_500Medium,
    Raleway_600SemiBold,
    Raleway_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5DC' }}>
        <ActivityIndicator size="large" color="#228B22" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
    <SettingsProvider>
    <ThemeProvider>
    <RestaurantProvider>
      <AppContent />
    </RestaurantProvider>
    </ThemeProvider>
    </SettingsProvider>
    </SafeAreaProvider>
  );
}
