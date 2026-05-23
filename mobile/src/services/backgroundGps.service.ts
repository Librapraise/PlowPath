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
// The notification copy below intentionally matches the Copy Requirements
// doc's tone — keep it short and unambiguous for drivers operating in gloves.
import BackgroundGeolocation from '@mauron85/react-native-background-geolocation';
import type { GpsSample } from './gps.service';
import { enqueueGpsSample, flushAllQueues } from './offline.service';

let configured = false;

export interface BackgroundGpsConfig {
  driverId: string;
  routeId?: string;
  /** Fires on every location event so the UI can update distance-to-stop. */
  onSample: (sample: GpsSample) => void;
}

interface MauronLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  bearing?: number;
  time?: number;
}

/**
 * Idempotently configure the SDK and (re)bind the location listener.
 * Safe to call from inside an effect that re-runs on driverId / routeId change.
 */
export function configureBackgroundGps(cfg: BackgroundGpsConfig): void {
  // Always replace listeners so we don't double-fire after reconfiguration.
  BackgroundGeolocation.removeAllListeners();

  BackgroundGeolocation.on<MauronLocation>('location', async (loc) => {
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

  BackgroundGeolocation.on<{ message: string }>('error', ({ message }) => {
    console.warn('[BG-GPS] error:', message);
  });

  BackgroundGeolocation.on('start', () => console.log('[BG-GPS] service started'));
  BackgroundGeolocation.on('stop', () => console.log('[BG-GPS] service stopped'));

  if (configured) return;

  BackgroundGeolocation.configure({
    // Sampling
    desiredAccuracy: BackgroundGeolocation.HIGH_ACCURACY,
    stationaryRadius: 25,
    distanceFilter: 10,
    locationProvider: BackgroundGeolocation.DISTANCE_FILTER_PROVIDER,
    interval: 30_000,        // Android-only; max desired sample interval
    fastestInterval: 10_000, // Android-only
    activitiesInterval: 10_000,

    // Lifecycle
    stopOnTerminate: false,
    startOnBoot: true,
    startForeground: true,    // Foreground service required for Android background tracking
    pauseLocationUpdates: false,

    // Android foreground service notification (visible while tracking)
    notificationTitle: 'PlowPath is tracking your route',
    notificationText: 'Tap to return to navigation',
    notificationIconColor: '#2E75B6',

    // iOS background mode
    saveBatteryOnBackground: false,

    // We're not relying on this lib's HTTP layer — offline.service.ts owns queueing.
    url: '',
    syncUrl: '',
    debug: __DEV__,
  });

  configured = true;
}

export function startBackgroundGps(): Promise<void> {
  return new Promise((resolve, reject) => {
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
  });
}

export function stopBackgroundGps(): void {
  BackgroundGeolocation.stop();
  BackgroundGeolocation.removeAllListeners();
}
