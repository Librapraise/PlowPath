import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle } from 'react-native-svg';

import RouteScreen from '../screens/RouteScreen';
import SignRouteScreen from '../screens/SignRouteScreen';
import InAppHistoryScreen from '../screens/InAppHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useSettingsStore } from '../store/settingsStore';

// Custom high-contrast SVG icons
const RouteIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 18l-6-3V3l6 3m0 12l6-3m-6 3V6m6 9l6 3V6l-6-3m0 12V3" />
  </Svg>
);

const SignIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 2L2 22h20L12 2z" />
    <Path d="M12 9v4" />
    <Path d="M12 17h.01" />
  </Svg>
);

const BellIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

const SettingsIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx={12} cy={12} r={3} />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const theme = useSettingsStore((s) => s.settings.theme);
  const isDark = theme === 'dark';

  // Premium design tokens
  const bgColor = isDark ? '#0F141E' : '#FFFFFF';
  const borderTopColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
  const activeColor = isDark ? '#38BDF8' : '#1D4ED8';
  const inactiveColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.35)';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: borderTopColor,
          borderTopWidth: 1.5,
          height: 72, // increased height for accessibility
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.35 : 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
        },
      }}
    >
      <Tab.Screen
        name="Route"
        component={RouteScreen}
        options={{
          tabBarLabel: "Today's Route",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {focused && <View style={{ position: 'absolute', top: -10, width: 40, height: 2, backgroundColor: activeColor, borderRadius: 2 }} />}
              <RouteIcon color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="SignRoute"
        component={SignRouteScreen}
        options={{
          tabBarLabel: 'Sign Operations',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {focused && <View style={{ position: 'absolute', top: -10, width: 40, height: 2, backgroundColor: activeColor, borderRadius: 2 }} />}
              <SignIcon color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={InAppHistoryScreen}
        options={{
          tabBarLabel: 'Notifications',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {focused && <View style={{ position: 'absolute', top: -10, width: 40, height: 2, backgroundColor: activeColor, borderRadius: 2 }} />}
              <BellIcon color={color} size={24} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              {focused && <View style={{ position: 'absolute', top: -10, width: 40, height: 2, backgroundColor: activeColor, borderRadius: 2 }} />}
              <SettingsIcon color={color} size={24} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
