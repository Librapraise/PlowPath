import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { initSentry, wrapApp } from './services/sentry';
import { navigationRef } from './services/navigation';
import SplashScreen from './screens/SplashScreen';

// Initialize Sentry crash reporting
initSentry();

const App = function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
      </NavigationContainer>
      {isSplashVisible && (
        <SplashScreen onAnimationComplete={() => setIsSplashVisible(false)} />
      )}
    </SafeAreaProvider>
  );
};

export default wrapApp(App);

