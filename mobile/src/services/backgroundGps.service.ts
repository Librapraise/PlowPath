// Wrapper around @mauron85/react-native-background-geolocation. Lets the
// driver app keep streaming GPS samples after the screen locks or the driver
// switches to another app — the foreground-only react-native-geolocation-service
// drops samples in that state, which CURRENT_STATE.md and the v3 PRD FR-1.2.3
// both call out as a blocker.
//
// LICENSE NOTE: mauron85's fork is MIT and free for both dev and production.
// Trade-off: the upstream package has been unmaintained since ~2021, so
// Android 14's stricter foreground-service-type rules may eventually require
// manual patches. Flag for replacement (Transistor or a self-built notifee
// service) when it actually breaks in the field.
//
// iOS NOTE: @mauron85/react-native-background-geolocation has a known native
// crash on iOS 16+ during app launch (before React Native initializes). The
// library is Android-only in this project until a maintained replacement is
// integrated. On iOS, background GPS is handled by the foreground GPS service
// which is sufficient for the current use case.
//
// The notification copy below intentionally matches the Copy Requirements
// doc's tone — keep it short and unambiguous for drivers operating in gloves.
import { Platform } from 'react-native';
import type { GpsSample } from './gps.service';
import { enqueueGpsSample, flushAllQueues } from './offline.service';

export interface BackgroundGpsConfig {
  driverId: string;
  routeId?: string;
  /** Fires on every location event so the UI can update distance-to-stop. */
  onSample: (sample: GpsSample) => void;
}

/**
 * Idempotently configure the SDK and (re)bind the location listener.
 * Safe to call from inside an effect that re-runs on driverId / routeId change.
 * No-op on iOS — background GPS uses the foreground GPS service on that platform.
 */
export function configureBackgroundGps(cfg: BackgroundGpsConfig): void {
  if (Platform.OS === 'ios') {
    console.log('[BG-GPS] Skipping BackgroundGeolocation config on iOS (not supported)');
    return;
  }

  // Android-only path
  void (async () => {
    try {
      const BackgroundGeolocation = (await import('@mauron85/react-native-background-geolocation')).default;

      // Always replace listeners so we don't double-fire after reconfiguration.
      BackgroundGeolocation.removeAllListeners();

      BackgroundGeolocation.on('location', async (loc: any) => {
        const sample: GpsSample = {
          lat: loc.latitude,
          lon: loc.longitude,
          accuracy_m: loc.accuracy,
          speed_mps: loc.speed,
          heading_deg: loc.bearing,
          recorded_at: loc.time ? new Date(loc.time).toISOString() : new Date().toISOString(),
        };
        cfg.onSample(sample);
        await enqueueGpsSample({ ...sample, route_id: cfg.routeId });
        void flushAllQueues(cfg.driverId);
      });

      BackgroundGeolocation.on('error', ({ message }: { message: string }) => {
        console.warn('[BG-GPS] error:', message);
      });

      BackgroundGeolocation.on('start', () => console.log('[BG-GPS] service started'));
      BackgroundGeolocation.on('stop', () => console.log('[BG-GPS] service stopped'));

      BackgroundGeolocation.configure({
        desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
        stationaryRadius: 25,
        distanceFilter: 10,
        locationProvider: BackgroundGeolocation.DISTANCE_FILTER_PROVIDER,
        interval: 30_000,
        fastestInterval: 10_000,
        activitiesInterval: 10_000,
        stopOnTerminate: false,
        startOnBoot: true,
        startForeground: true,
        pauseLocationUpdates: false,
        notificationTitle: 'PlowPath is tracking your route',
        notificationText: 'Tap to return to navigation',
        notificationIconColor: '#2E75B6',
        saveBatteryOnBackground: false,
        url: '',
        syncUrl: '',
        debug: false,
      });
    } catch (err) {
      console.warn('[BG-GPS] Failed to configure BackgroundGeolocation:', err);
    }
  })();
}

export function startBackgroundGps(): Promise<void> {
  if (Platform.OS === 'ios') {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    import('@mauron85/react-native-background-geolocation').then(({ default: BackgroundGeolocation }) => {
      BackgroundGeolocation.checkStatus(
        (status: { isRunning: boolean; locationServicesEnabled: boolean; authorization: number }) => {
          if (!status.locationServicesEnabled) {
            reject(new Error('Device location services are disabled'));
            return;
          }
          if (!status.isRunning) {
            BackgroundGeolocation.start();
          }
          resolve();
        },
        (err: unknown) => reject(err as Error),
      );
    }).catch(reject);
  });
}

export function stopBackgroundGps(): void {
  if (Platform.OS === 'ios') return;
  import('@mauron85/react-native-background-geolocation').then(({ default: BackgroundGeolocation }) => {
    BackgroundGeolocation.stop();
    BackgroundGeolocation.removeAllListeners();
  }).catch(() => {});
}

