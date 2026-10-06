// A small client for Back4App's Parse REST API. Every class the app writes
// stores an `owner` pointer and an ACL that only lets that user read or write
// the object, so one account can never see another's data.
//
// Keys come from `.env.local` (see `.env.example`). The Application ID and
// JavaScript key are meant to ship inside the app; never put the Master Key here.

const SERVER_URL = (process.env.EXPO_PUBLIC_BACK4APP_SERVER_URL || 'https://parseapi.back4app.com').replace(
  /\/$/,
  '',
);
const APP_ID = process.env.EXPO_PUBLIC_BACK4APP_APP_ID;
const JS_KEY = process.env.EXPO_PUBLIC_BACK4APP_JS_KEY;

/** Parse error codes the app reacts to. */
export const ErrorCode = {
  CONNECTION_FAILED: 100,
  OBJECT_NOT_FOUND: 101,
  INVALID_EMAIL: 125,
  INVALID_SESSION_TOKEN: 209,
  USERNAME_TAKEN: 202,
  EMAIL_TAKEN: 203,
} as const;

export class ParseError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

export type ParseObject = { objectId: string; createdAt: string; updatedAt: string };
export type Pointer = { __type: 'Pointer'; className: string; objectId: string };
type Where = Record<string, unknown>;

let sessionToken: string | null = null;
let onInvalidSession: (() => void) | null = null;

export function setSessionToken(token: string | null): void {
  sessionToken = token;
}

/** Called when the server rejects the stored session, e.g. after it was revoked. */
export function setInvalidSessionHandler(handler: (() => void) | null): void {
  onInvalidSession = handler;
}

export async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!APP_ID || !JS_KEY) {
    throw new ParseError(
      ErrorCode.CONNECTION_FAILED,
      'Back4App is not configured. Add your keys to .env.local and restart the dev server.',
    );
  }
  const headers: Record<string, string> = {
    'X-Parse-Application-Id': APP_ID,
    'X-Parse-Javascript-Key': JS_KEY,
    'Content-Type': 'application/json',
  };
  if (sessionToken) headers['X-Parse-Session-Token'] = sessionToken;

  let response: Response;
  try {
    response = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ParseError(ErrorCode.CONNECTION_FAILED, "Can't reach the server. Check your connection.");
  }

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = typeof json.code === 'number' ? json.code : response.status;
    if (code === ErrorCode.INVALID_SESSION_TOKEN && sessionToken) onInvalidSession?.();
    throw new ParseError(code, json.error || `Request failed (${response.status}).`);
  }
  return json as T;
}

export function pointer(className: string, objectId: string): Pointer {
  return { __type: 'Pointer', className, objectId };
}

export function userPointer(userId: string): Pointer {
  return pointer('_User', userId);
}

/** Fields that make an object belong to (and be visible only to) `userId`. */
export function owned(userId: string): { owner: Pointer; ACL: Record<string, { read: true; write: true }> } {
  return { owner: userPointer(userId), ACL: { [userId]: { read: true, write: true } } };
}

/** Removes a field from an object when used as a value in `update`. */
export const UNSET = { __op: 'Delete' } as const;

function queryString(params: Record<string, string | number | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function find<T>(
  className: string,
  where: Where,
  options: { order?: string; include?: string; keys?: string; limit?: number } = {},
): Promise<(T & ParseObject)[]> {
  const { results } = await request<{ results: (T & ParseObject)[] }>(
    'GET',
    `/classes/${className}${queryString({ where: JSON.stringify(where), limit: 1000, ...options })}`,
  );
  return results;
}

export async function count(className: string, where: Where): Promise<number> {
  const { count: n } = await request<{ count: number }>(
    'GET',
    `/classes/${className}${queryString({ where: JSON.stringify(where), count: 1, limit: 0 })}`,
  );
  return n;
}

/** The object, or null if it doesn't exist or belongs to someone else. */
export async function get<T>(className: string, objectId: string): Promise<(T & ParseObject) | null> {
  try {
    return await request<T & ParseObject>('GET', `/classes/${className}/${objectId}`);
  } catch (e) {
    if (e instanceof ParseError && e.code === ErrorCode.OBJECT_NOT_FOUND) return null;
    throw e;
  }
}

export async function create(className: string, data: object): Promise<string> {
  const { objectId } = await request<{ objectId: string }>('POST', `/classes/${className}`, data);
  return objectId;
}

export async function update(className: string, objectId: string, data: object): Promise<void> {
  await request('PUT', `/classes/${className}/${objectId}`, data);
}

export async function destroy(className: string, objectId: string): Promise<void> {
  await request('DELETE', `/classes/${className}/${objectId}`);
}

export type BatchOp = { method: 'POST' | 'PUT' | 'DELETE'; path: string; body?: object };

/** Runs many writes in as few requests as possible. Not atomic. */
export async function batch(ops: BatchOp[]): Promise<void> {
  const BATCH_LIMIT = 50;
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const results = await request<{ error?: { code: number; error: string } }[]>('POST', '/batch', {
      requests: ops.slice(i, i + BATCH_LIMIT),
    });
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new ParseError(failed.error.code, failed.error.error);
  }
}
