import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RouteScreen from '../screens/RouteScreen';
import NavigationScreen from '../screens/NavigationScreen';
import InAppHistoryScreen from '../screens/InAppHistoryScreen';
import SignRouteScreen from '../screens/SignRouteScreen';
import { useAuthStore } from '../store/authStore';
import { type RootStackParamList } from '../services/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const token = useAuthStore((s) => s.token);

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#2E75B6' }, headerTintColor: 'white' }}>
      {token ? (
        <>
          <Stack.Screen name="Route" component={RouteScreen} options={{ title: 'Today\'s Route' }} />
          <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Navigation' }} />
          <Stack.Screen name="History" component={InAppHistoryScreen} options={{ title: 'Notification History' }} />
          <Stack.Screen name="SignRoute" component={SignRouteScreen} options={{ title: 'Sign Crew Operations' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Start Shift' }} />
      )}
    </Stack.Navigator>
  );
}
