import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import NavigationScreen from '../screens/NavigationScreen';
import ShiftSwapScreen from '../screens/ShiftSwapScreen';
import TabNavigator from './TabNavigator';
import { useAuthStore } from '../store/authStore';
import { type RootStackParamList } from '../services/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const token = useAuthStore((s) => s.token);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="Navigation" component={NavigationScreen} />
          <Stack.Screen name="ShiftSwap" component={ShiftSwapScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
