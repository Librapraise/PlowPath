import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation, { type GeoPosition } from 'react-native-geolocation-service';

export interface GpsSample {
  lat: number;
  lon: number;
  accuracy_m?: number;
  speed_mps?: number;
  heading_deg?: number;
  recorded_at: string;
}

/** Ask the OS for foreground location permission. iOS uses Info.plist + JS prompt; Android uses runtime. */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await Geolocation.requestAuthorization('whenInUse');
    return status === 'granted';
  }
  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'PlowPath needs your location',
        message: 'We use GPS to track route progress and notify customers.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return false;
}

export type GpsWatchHandle = number;

export function watchPosition(onSample: (s: GpsSample) => void, onError?: (err: Error) => void): GpsWatchHandle {
  return Geolocation.watchPosition(
    (pos: GeoPosition) => {
      onSample({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
        speed_mps: pos.coords.speed ?? undefined,
        heading_deg: pos.coords.heading ?? undefined,
        recorded_at: new Date(pos.timestamp).toISOString(),
      });
    },
    (err) => {
      onError?.(new Error(`${err.code}: ${err.message}`));
    },
    {
      enableHighAccuracy: true,
      distanceFilter: 10,    // meters between updates
      interval: 30_000,       // Android-only: 30s per PRD
      fastestInterval: 10_000,
      showsBackgroundLocationIndicator: true,
    },
  );
}

export function clearWatch(id: GpsWatchHandle): void {
  Geolocation.clearWatch(id);
}
