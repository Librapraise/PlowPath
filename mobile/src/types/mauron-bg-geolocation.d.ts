// Minimal ambient typings for @mauron85/react-native-background-geolocation.
// The package doesn't ship its own .d.ts files. Cover only the surface we use
// in backgroundGps.service.ts; extend if more methods are needed later.
declare module '@mauron85/react-native-background-geolocation' {
  interface ConfigureOptions {
    desiredAccuracy?: number;
    stationaryRadius?: number;
    distanceFilter?: number;
    locationProvider?: number;
    interval?: number;
    fastestInterval?: number;
    activitiesInterval?: number;
    stopOnTerminate?: boolean;
    startOnBoot?: boolean;
    startForeground?: boolean;
    pauseLocationUpdates?: boolean;
    notificationTitle?: string;
    notificationText?: string;
    notificationIconColor?: string;
    notificationIconLarge?: string;
    notificationIconSmall?: string;
    saveBatteryOnBackground?: boolean;
    url?: string;
    syncUrl?: string;
    debug?: boolean;
  }

  interface CheckStatusResult {
    isRunning: boolean;
    locationServicesEnabled: boolean;
    authorization: number;
  }

  // Listener event signatures we use.
  type Listener =
    | 'location'
    | 'stationary'
    | 'activity'
    | 'error'
    | 'authorization'
    | 'start'
    | 'stop'
    | 'foreground'
    | 'background';

  const BackgroundGeolocation: {
    // Provider / accuracy constants
    HIGH_ACCURACY: number;
    MEDIUM_ACCURACY: number;
    LOW_ACCURACY: number;
    PASSIVE_ACCURACY: number;
    DISTANCE_FILTER_PROVIDER: number;
    ACTIVITY_PROVIDER: number;
    RAW_PROVIDER: number;

    configure(options: ConfigureOptions): void;
    start(): void;
    stop(): void;
    checkStatus(success: (status: CheckStatusResult) => void, fail?: (err: unknown) => void): void;
    on<T = unknown>(event: Listener, callback: (data: T) => void): void;
    removeAllListeners(): void;
  };

  export default BackgroundGeolocation;
}
