// A small client for Back4App. Sign-up, sign-in and sign-out use Parse's REST
// endpoints; everything else is one call to a Cloud Code function (see
// `cloud/main.js`), so each screen or action is a single round trip.
//
// Keys come from `.env.local` (see `.env.example`). The Application ID and
// JavaScript key are meant to ship inside the app; never put the Master Key here.

const SERVER_URL = (process.env.EXPO_PUBLIC_BACK4APP_SERVER_URL || 'https://parseapi.back4app.com').replace(
  /\/$/,
  '',
);
const APP_ID = process.env.EXPO_PUBLIC_BACK4APP_APP_ID;
const JS_KEY = process.env.EXPO_PUBLIC_BACK4APP_JS_KEY;

/** How long a request may take before it's treated as a dropped connection. */
const REQUEST_TIMEOUT_MS = 20_000;

/** Parse error codes the app reacts to. */
export const ErrorCode = {
  NOT_CONFIGURED: -1,
  CONNECTION_FAILED: 100,
  OBJECT_NOT_FOUND: 101,
  INVALID_EMAIL: 125,
  SCRIPT_FAILED: 141,
  INVALID_SESSION_TOKEN: 209,
  USERNAME_TAKEN: 202,
  EMAIL_TAKEN: 203,
} as const;

/** True when a request failed because the server couldn't be reached (offline, or too slow). */
export function isConnectionError(e: unknown): boolean {
  return e instanceof ParseError && e.code === ErrorCode.CONNECTION_FAILED;
}

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
      ErrorCode.NOT_CONFIGURED,
      'Back4App is not configured. Add your keys to .env.local and restart the dev server.',
    );
  }
  const headers: Record<string, string> = {
    'X-Parse-Application-Id': APP_ID,
    'X-Parse-Javascript-Key': JS_KEY,
    'Content-Type': 'application/json',
  };
  if (sessionToken) headers['X-Parse-Session-Token'] = sessionToken;

  // A request that hangs on a weak connection is given up on, like a dropped one.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  let json: any;
  try {
    response = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    json = await response.json().catch(() => ({}));
  } catch {
    throw new ParseError(ErrorCode.CONNECTION_FAILED, "Can't reach the server. Check your connection.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const code = typeof json.code === 'number' ? json.code : response.status;
    if (code === ErrorCode.INVALID_SESSION_TOKEN && sessionToken) onInvalidSession?.();
    throw new ParseError(code, json.error || `Request failed (${response.status}).`);
  }
  return json as T;
}

/**
 * Calls a Cloud Code function from `cloud/main.js` as the signed-in user and
 * returns its result.
 */
export async function callFunction<T>(name: string, params: object = {}): Promise<T> {
  try {
    const { result } = await request<{ result: T }>('POST', `/functions/${name}`, params);
    return result;
  } catch (e) {
    if (e instanceof ParseError && e.code === ErrorCode.SCRIPT_FAILED && e.message.startsWith('Invalid function')) {
      throw new ParseError(e.code, `The server is missing "${name}". Deploy cloud/main.js to Back4App Cloud Code.`);
    }
    throw e;
  }
}
