import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RouteScreen from '../screens/RouteScreen';
import NavigationScreen from '../screens/NavigationScreen';
import { useAuthStore } from '../store/authStore';

export type RootStackParamList = {
  Login: undefined;
  Route: undefined;
  Navigation: { routeId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const token = useAuthStore((s) => s.token);

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#2E75B6' }, headerTintColor: 'white' }}>
      {token ? (
        <>
          <Stack.Screen name="Route" component={RouteScreen} options={{ title: 'Today\'s Route' }} />
          <Stack.Screen name="Navigation" component={NavigationScreen} options={{ title: 'Navigation' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Start Shift' }} />
      )}
    </Stack.Navigator>
  );
}
