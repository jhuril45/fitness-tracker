import AsyncStorage from '@react-native-async-storage/async-storage';

import { isConnectionError } from './back4app';
import { markDone, markNotDone } from './schedule';

// Check-offs on the Today screen are saved through this queue so they never
// wait on the network for long. Each one is stored on the device first, then
// sent in the background; if the connection is down or too slow it stays
// queued (across app restarts too) and is retried until the server has it.
// Sending is safe to repeat: the server never duplicates a check-off.

/** How long a tap waits for the server before carrying on in the background. */
export const FOREGROUND_WAIT_MS = 1000;
const STORAGE_KEY = 'fitness-tracker.pending-check-offs';
const RETRY_MIN_MS = 3000;
const RETRY_MAX_MS = 60_000;

export type PendingCheckOff = {
  /** `itemId:exerciseId:date`; later changes to the same check-off replace earlier ones. */
  key: string;
  userId: string;
  itemId: string;
  exerciseId: string;
  date: string;
  done: boolean;
  /** Known check-off records, so an uncheck can delete them directly. */
  completionIds: string[];
  /** Bumped on every change, so a send that finishes late doesn't drop a newer change. */
  version: number;
};

export type SyncedCheckOff = { entry: PendingCheckOff; completionId: string | null; weight: number | null };

let queue: PendingCheckOff[] = [];
let loaded: Promise<void> | null = null;
let currentUserId: string | null = null;
let flushing: Promise<void> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryDelay = RETRY_MIN_MS;

const listeners = new Set<() => void>();
const syncedListeners = new Set<(synced: SyncedCheckOff) => void>();
const failedListeners = new Set<(entry: PendingCheckOff, message: string) => void>();
/** Resolves a submit waiting on a given key and version. */
const waiters = new Map<string, { resolve: () => void; reject: (e: unknown) => void }>();

export function checkOffKey(itemId: string, exerciseId: string, date: string): string {
  return `${itemId}:${exerciseId}:${date}`;
}

function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const saved: PendingCheckOff[] = raw ? JSON.parse(raw) : [];
      // Keep anything queued in this session before storage finished loading.
      const keys = new Set(queue.map((e) => e.key + e.userId));
      queue = [...saved.filter((e) => !keys.has(e.key + e.userId)), ...queue];
      notify();
    })
    .catch(() => {});
  return loaded;
}

function persist(): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue)).catch(() => {});
}

function notify(): void {
  for (const listener of listeners) listener();
}

function setQueue(next: PendingCheckOff[]): void {
  queue = next;
  persist();
  notify();
}

// ---------------------------------------------------------------- reading

/** For useSyncExternalStore: re-render when the queue changes. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The queue itself; a new array on every change. */
export function getQueue(): PendingCheckOff[] {
  return queue;
}

/** Called after the server confirms a check-off, before it leaves the queue. */
export function onCheckOffSynced(listener: (synced: SyncedCheckOff) => void): () => void {
  syncedListeners.add(listener);
  return () => syncedListeners.delete(listener);
}

/** Called when the server rejects a check-off (e.g. the workout was deleted); it's dropped. */
export function onCheckOffFailed(listener: (entry: PendingCheckOff, message: string) => void): () => void {
  failedListeners.add(listener);
  return () => failedListeners.delete(listener);
}

// ---------------------------------------------------------------- writing

/**
 * Checks an exercise off (or unchecks it) for a day. Waits up to
 * FOREGROUND_WAIT_MS for the server: resolves "synced" if it confirmed in
 * time, otherwise "pending" and the save carries on in the background.
 * Rejects only if the server refused it within that time.
 */
export async function submitCheckOff(input: {
  userId: string;
  itemId: string;
  exerciseId: string;
  date: string;
  done: boolean;
  completionIds: string[];
}): Promise<'synced' | 'pending'> {
  const key = checkOffKey(input.itemId, input.exerciseId, input.date);
  const existing = queue.find((e) => e.key === key && e.userId === input.userId);
  const entry: PendingCheckOff = { ...input, key, version: (existing?.version ?? 0) + 1 };
  setQueue([...queue.filter((e) => e !== existing), entry]);

  const settled = new Promise<'synced'>((resolve, reject) => {
    waiters.set(waiterKey(entry), { resolve: () => resolve('synced'), reject });
  });
  void flush();
  const timeout = new Promise<'pending'>((resolve) => setTimeout(() => resolve('pending'), FOREGROUND_WAIT_MS));
  try {
    return await Promise.race([settled, timeout]);
  } finally {
    // A late result is still delivered through the synced/failed listeners.
    waiters.delete(waiterKey(entry));
  }
}

function waiterKey(entry: PendingCheckOff): string {
  return `${entry.userId}|${entry.key}|${entry.version}`;
}

/** Starts sending the signed-in user's queued check-offs, and keeps retrying while any remain. */
export function startCheckOffSync(userId: string): void {
  currentUserId = userId;
  retryDelay = RETRY_MIN_MS;
  void load().then(flush);
}

export function stopCheckOffSync(): void {
  currentUserId = null;
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
}

/** Sends queued check-offs now, e.g. when the connection comes back. */
export function flush(): Promise<void> {
  flushing ??= sendAll().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function sendAll(): Promise<void> {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  for (;;) {
    const entry = queue.find((e) => e.userId === currentUserId);
    if (!entry) return;
    try {
      let completionId: string | null = null;
      let weight: number | null = null;
      if (entry.done) {
        ({ completionId, weight } = await markDone(entry.itemId, entry.exerciseId, entry.date));
      } else {
        await markNotDone(entry.itemId, entry.exerciseId, entry.date, entry.completionIds);
      }
      retryDelay = RETRY_MIN_MS;
      for (const listener of syncedListeners) listener({ entry, completionId, weight });
      waiters.get(waiterKey(entry))?.resolve();
      // Keep it if the user changed this check-off again while it was being sent.
      setQueue(queue.filter((e) => !(e.key === entry.key && e.userId === entry.userId && e.version === entry.version)));
    } catch (e) {
      if (isConnectionError(e)) {
        scheduleRetry();
        return;
      }
      const message = e instanceof Error ? e.message : 'Could not save the check-off.';
      setQueue(queue.filter((q) => !(q.key === entry.key && q.userId === entry.userId)));
      for (const listener of failedListeners) listener(entry, message);
      waiters.get(waiterKey(entry))?.reject(e);
    }
  }
}

function scheduleRetry(): void {
  if (retryTimer || currentUserId === null) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void flush();
  }, retryDelay);
  retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
}
