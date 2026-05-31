import { createNavigationContainerRef } from '@react-navigation/native';

export type RootStackParamList = {
  Login: undefined;
  Route: undefined;
  Navigation: { routeId: string };
  History: undefined;
  SignRoute: undefined;
  Settings: undefined;
  ShiftSwap: undefined;
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name as any, params as any);
  }
}
