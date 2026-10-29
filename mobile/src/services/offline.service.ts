import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import type { GpsSample } from './gps.service';

const QUEUE_KEY = 'plowpath.gpsQueue.v1';
const STOP_QUEUE_KEY = 'plowpath.stopQueue.v1';
const MAX_BATCH = 200;

interface QueuedSample extends GpsSample {
  route_id?: string;
}

export interface QueuedStopStatus {
  routeId: string;
  stopId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  notes?: string;
  timestamp: string;
  retryCount?: number;
}

async function readQueue(): Promise<QueuedSample[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedSample[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedSample[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Enqueue a GPS sample to be flushed when connectivity returns. */
export async function enqueueGpsSample(sample: QueuedSample): Promise<void> {
  const queue = await readQueue();
  queue.push(sample);
  await writeQueue(queue);
}

/**
 * Attempt to flush the queue to the server. Safe to call frequently —
 * it short-circuits when offline or when the queue is empty.
 */
export async function flushGpsQueue(driverId: string): Promise<{ flushed: number } | { skipped: string }> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return { skipped: 'offline' };

  const queue = await readQueue();
  if (queue.length === 0) return { flushed: 0 };

  const batch = queue.slice(0, MAX_BATCH);
  try {
    await api.post('/tracking', { driver_id: driverId, points: batch });
    const remaining = queue.slice(batch.length);
    await writeQueue(remaining);
    return { flushed: batch.length };
  } catch {
    // Network blip — leave queue intact for next flush attempt.
    return { skipped: 'request_failed' };
  }
}

/* --- Stop Status Offline-First Queue --- */

export async function readStopQueue(): Promise<QueuedStopStatus[]> {
  const raw = await AsyncStorage.getItem(STOP_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedStopStatus[];
  } catch {
    return [];
  }
}

export async function writeStopQueue(queue: QueuedStopStatus[]): Promise<void> {
  await AsyncStorage.setItem(STOP_QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueStopStatus(
  routeId: string,
  stopId: string,
  status: QueuedStopStatus['status'],
  notes?: string,
): Promise<void> {
  const queue = await readStopQueue();
  queue.push({
    routeId,
    stopId,
    status,
    notes,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  });
  await writeStopQueue(queue);
}

const MAX_RETRIES = 3;

export async function flushStopQueue(): Promise<{ flushed: number } | { skipped: string }> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return { skipped: 'offline' };

  const queue = await readStopQueue();
  if (queue.length === 0) return { flushed: 0 };

  let flushedCount = 0;
  const retry: QueuedStopStatus[] = [];

  for (const item of queue) {
    try {
      await api.put(`/routes/${item.routeId}/stops/${item.stopId}`, {
        status: item.status,
        notes: item.notes,
      });
      flushedCount++;
    } catch (err) {
      const errorObj = err as { response?: { status?: number } };
      const status = errorObj?.response?.status;
      const retries = (item.retryCount ?? 0) + 1;

      // Drop items that have exceeded max retries or received permanent errors (413, 400)
      if (retries >= MAX_RETRIES || status === 413 || status === 400) {
        console.warn(`[OFFLINE] Dropping stop queue item after ${retries} attempts (HTTP ${status})`, item.stopId);
        // The status is already saved in the local AsyncStorage cache — safe to drop
      } else {
        retry.push({ ...item, retryCount: retries });
      }
    }
  }

  await writeStopQueue(retry);
  return { flushed: flushedCount };
}

export function subscribeToConnectivity(onReconnect: () => void): () => void {
  // Track previous state so we only fire on the offline→online transition,
  // not on every NetInfo poll that happens to be in a connected state.
  let wasConnected: boolean | null = null;

  return NetInfo.addEventListener((state) => {
    const isNowConnected = state.isConnected ?? false;
    if (wasConnected === false && isNowConnected) {
      onReconnect();
    }
    wasConnected = isNowConnected;
  });
}

/** Get the current counts of queued GPS samples and stop status changes. */
export async function getQueueDepths(): Promise<{ gpsCount: number; stopCount: number }> {
  const gpsQueue = await readQueue();
  const stopQueue = await readStopQueue();
  return {
    gpsCount: gpsQueue.length,
    stopCount: stopQueue.length,
  };
}

/** Flush both the stop status queue and the GPS tracking queue. */
export async function flushAllQueues(driverId: string): Promise<void> {
  await flushStopQueue();
  await flushGpsQueue(driverId);
}
