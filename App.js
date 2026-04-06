import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { RestaurantProvider } from './context/RestaurantContext';
import MainScreen from './screens/MainScreen';
import LikedScreen from './screens/LikedScreen';
import NotNowScreen from './screens/NotNowScreen';
import DetailScreen from './screens/DetailScreen';
import MapPickerScreen from './screens/MapPickerScreen';
import DecisionScreen from './screens/DecisionScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ emoji, focused }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#f0f0f0',
          paddingTop: 4,
          height: Platform.OS === 'ios' ? 84 : 60,
        },
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#aaa',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: Platform.OS === 'ios' ? 0 : 4 },
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
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        }}
      />
      <Tab.Screen
        name="Not Now"
        component={NotNowScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👋" focused={focused} />,
          headerShown: true,
          headerTitle: 'Not Now',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <RestaurantProvider>
        <NavigationContainer>
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
              name="Decision"
              component={DecisionScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
          </Stack.Navigator>
          <StatusBar style="dark" />
        </NavigationContainer>
    </RestaurantProvider>
  );
}
