import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

import RouteScreen from '../screens/RouteScreen';
import SignRouteScreen from '../screens/SignRouteScreen';
import InAppHistoryScreen from '../screens/InAppHistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Custom high-contrast premium 2px stroke weight SVG icons
const RouteIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
    <Path d="M9 3v15" />
    <Path d="M15 6v15" />
  </Svg>
);

const ClipboardIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <Path d="M9 12h6M9 16h6" />
  </Svg>
);

const BellIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

const SettingsIcon = ({ color, size }: { color: string; size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  // Hardcoded premium dark color scheme for the bottom bar as requested
  const bgColor = '#0F141E';
  const borderTopColor = 'rgba(255, 255, 255, 0.08)';
  const activeColor = '#3B82F6';
  const inactiveColor = 'rgba(255, 255, 255, 0.35)';

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: borderTopColor,
          borderTopWidth: 1.0,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 4,
        },
      }}
    >
      <Tab.Screen
        name="Route"
        component={RouteScreen}
        options={{
          tabBarLabel: "Today's Route",
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    top: -10,
                    width: 32,
                    height: 3,
                    backgroundColor: activeColor,
                    borderRadius: 1.5,
                  }}
                />
              )}
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
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    top: -10,
                    width: 32,
                    height: 3,
                    backgroundColor: activeColor,
                    borderRadius: 1.5,
                  }}
                />
              )}
              <ClipboardIcon color={color} size={24} />
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
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    top: -10,
                    width: 32,
                    height: 3,
                    backgroundColor: activeColor,
                    borderRadius: 1.5,
                  }}
                />
              )}
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
            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              {focused && (
                <View
                  style={{
                    position: 'absolute',
                    top: -10,
                    width: 32,
                    height: 3,
                    backgroundColor: activeColor,
                    borderRadius: 1.5,
                  }}
                />
              )}
              <SettingsIcon color={color} size={24} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
