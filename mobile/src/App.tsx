import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { initSentry } from './services/sentry';
import { navigationRef } from './services/navigation';
import * as Sentry from '@sentry/react-native';

// Initialize Sentry crash reporting
initSentry();

export default Sentry.wrap(function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
});
