import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

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
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: t.tabBar,
          borderTopColor: t.separator,
          borderTopWidth: 0.5,
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 84 : 60,
        },
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.textTertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginBottom: Platform.OS === 'ios' ? 0 : 4 },
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
          headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.text },
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
          headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.text },
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
          headerTitleStyle: { fontWeight: '700', fontSize: 17, color: t.text },
        }}
      />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { settings } = useSettings();
  const t = useTheme();
  const isDark = settings.darkMode;

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
            headerTitleStyle: { fontWeight: '600', fontSize: 17, color: t.text },
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
  return (
    <SettingsProvider>
    <ThemeProvider>
    <RestaurantProvider>
      <AppContent />
    </RestaurantProvider>
    </ThemeProvider>
    </SettingsProvider>
  );
}
