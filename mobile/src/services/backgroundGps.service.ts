// Wrapper around Transistor's react-native-background-geolocation. Lets the
// driver app keep streaming GPS samples after the screen locks or the driver
// switches to another app — the foreground-only react-native-geolocation-service
// drops samples in that state, which CURRENT_STATE.md and the v3 PRD FR-1.2.3
// both call out as a blocker.
//
// LICENSE NOTE: Transistor's SDK is free in dev/CI and behind a one-time
// commercial license (~$300/platform) for App Store / Play Store release.
// The Android foreground service notification copy below intentionally matches
// the Copy Requirements doc's tone — keep it short and unambiguous for drivers.
import BackgroundGeolocation, {
  type Location,
  type State,
} from 'react-native-background-geolocation';
import type { GpsSample } from './gps.service';
import { enqueueGpsSample, flushAllQueues } from './offline.service';

let configured = false;

export interface BackgroundGpsConfig {
  driverId: string;
  routeId?: string;
  /** Fires on every location event so the UI can update distance-to-stop. */
  onSample: (sample: GpsSample) => void;
}

/**
 * Idempotently configure the SDK. Subsequent calls just rebind the listener.
 * Safe to call from inside an effect that re-runs on driverId / routeId change.
 */
export async function configureBackgroundGps(cfg: BackgroundGpsConfig): Promise<State> {
  BackgroundGeolocation.removeListeners();

  BackgroundGeolocation.onLocation(async (loc: Location) => {
    const sample: GpsSample = {
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      accuracy_m: loc.coords.accuracy,
      speed_mps: loc.coords.speed ?? undefined,
      heading_deg: loc.coords.heading ?? undefined,
      recorded_at: loc.timestamp ?? new Date().toISOString(),
    };
    cfg.onSample(sample);
    await enqueueGpsSample({ ...sample, route_id: cfg.routeId });
    void flushAllQueues(cfg.driverId);
  });

  BackgroundGeolocation.onMotionChange((event) => {
    // Helpful in field debugging — Transistor flips between stationary / moving.
    console.log('[BG-GPS] motion change:', event.isMoving);
  });

  if (configured) {
    return BackgroundGeolocation.getState();
  }

  const state = await BackgroundGeolocation.ready({
    // Sampling
    desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    distanceFilter: 10,
    stationaryRadius: 25,
    // Lifecycle
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    // Android foreground service — required to keep tracking with screen off.
    foregroundService: true,
    notification: {
      title: 'PlowPath is tracking your route',
      text: 'Tap to return to navigation',
      smallIcon: 'mipmap/ic_launcher',
      priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_DEFAULT,
    },
    // iOS background-mode
    pausesLocationUpdatesAutomatically: false,
    activityType: BackgroundGeolocation.ACTIVITY_TYPE_AUTOMOTIVE_NAVIGATION,
    // We're not relying on Transistor's HTTP layer — offline.service.ts owns queueing.
    autoSync: false,
    // Don't be chatty in production.
    debug: __DEV__,
    logLevel: __DEV__
      ? BackgroundGeolocation.LOG_LEVEL_VERBOSE
      : BackgroundGeolocation.LOG_LEVEL_ERROR,
  });

  configured = true;
  return state;
}

export async function startBackgroundGps(): Promise<void> {
  const state = await BackgroundGeolocation.getState();
  if (!state.enabled) {
    await BackgroundGeolocation.start();
  }
}

export async function stopBackgroundGps(): Promise<void> {
  await BackgroundGeolocation.stop();
  BackgroundGeolocation.removeListeners();
}
