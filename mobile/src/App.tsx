import { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './navigation/RootNavigator';
import { initSentry, wrapApp } from './services/sentry';
import { navigationRef } from './services/navigation';
import SplashScreen from './screens/SplashScreen';
import { pushService } from './services/push.service';

// Initialize Sentry crash reporting
initSentry();

const App = function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    // Register FCM foreground/background handlers so incoming push
    // notifications get logged to AsyncStorage (visible in the Notifications screen).
    const unsubscribe = pushService.registerNotificationHandlers();
    return unsubscribe;
  }, []);

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

