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
  });
  await writeStopQueue(queue);
}

export async function flushStopQueue(): Promise<{ flushed: number } | { skipped: string }> {
  const net = await NetInfo.fetch();
  if (!net.isConnected) return { skipped: 'offline' };

  const queue = await readStopQueue();
  if (queue.length === 0) return { flushed: 0 };

  let flushedCount = 0;
  for (const item of queue) {
    try {
      await api.put(`/routes/${item.routeId}/stops/${item.stopId}`, {
        status: item.status,
        notes: item.notes,
      });
      flushedCount++;
    } catch (err) {
      console.error('Failed to flush stop status', item, err);
      const remaining = queue.slice(flushedCount);
      await writeStopQueue(remaining);
      return { skipped: 'request_failed' };
    }
  }

  await writeStopQueue([]);
  return { flushed: flushedCount };
}

export function subscribeToConnectivity(onReconnect: () => void): () => void {
  return NetInfo.addEventListener((state) => {
    if (state.isConnected) onReconnect();
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
