import { isRouteErrorResponse } from 'react-router-dom';
import { Api } from 'src/config/api';
import { REACT_APP_BUILD_ID } from 'src/version';
import { url } from './utils';

// Kept in sync with the field limits of the ingest endpoint, so a long message is trimmed here
// instead of being rejected there — a dropped report is a blind spot.
const LIMITS = { message: 500, type: 100, stack: 4000, route: 500, version: 50 };

const CHUNK_RELOAD_KEY = 'dfx.chunkReloadAt';
const CHUNK_RELOAD_WINDOW = 30000;

// Identifies this app to the API, which logs it alongside the error. Without it every report
// from here is filed as an unknown client.
const CLIENT_NAME = 'dfx-services';

export interface ErrorFacts {
  message: string;
  type?: string;
  stack?: string;
}

export function toErrorFacts(error: unknown): ErrorFacts {
  if (isRouteErrorResponse(error)) {
    // Thrown when no route matches the URL, and by loaders returning a Response.
    return { message: `${error.status} ${error.statusText}`, type: 'RouteErrorResponse' };
  }

  if (error instanceof Error) return { message: error.message, type: error.name, stack: error.stack };

  return { message: String(error) };
}

// A chunk request that fails is reported by the bundler as a ChunkLoadError. That covers the stale
// chunk answered with the app shell too: the script loads, never registers the chunk, and the
// bundler's own loader turns the load event into `Loading chunk N failed. (missing: <url>)` with
// the name ChunkLoadError.
//
// Deliberately NOT matched: the bare syntax-error wordings a browser produces while parsing that
// HTML as a script. `Unexpected token '<'` is also what JSON.parse says when a response is HTML
// instead of JSON — an everyday failure whenever a gateway, WAF or login redirect answers an API
// call. Treating that as a chunk failure would reload the page and discard whatever the customer
// had typed, which is worse than the failure it recovers from. The wordings below identify the
// real case on their own.
export function isChunkLoadError(error: unknown): boolean {
  const { message, type } = toErrorFacts(error);

  return (
    type === 'ChunkLoadError' ||
    /Loading (CSS )?chunk [\w-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module/i.test(message)
  );
}

// A new deploy replaces the content-hashed chunks, so a tab left open across one can request a
// chunk that no longer exists. Reload once to pick up the new chunks. The guard lives in
// localStorage (it survives the sessionStorage.clear() on session/login URLs) and is time-boxed,
// so a persistent failure reloads at most once per window instead of looping. Storage access is
// wrapped because embedded/iframe contexts can block it.
export function reloadOnceForChunkError(): void {
  try {
    const last = Number(localStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    if (Date.now() - last < CHUNK_RELOAD_WINDOW) return;
    localStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return; // storage blocked (e.g. embedded iframe) — skip to avoid an unguarded reload loop
  }

  window.location.reload();
}

// Reports an error the user actually saw. Fire-and-forget: a failing report must never surface as
// a second error. `keepalive` lets the request outlive the reload that may follow it.
export function reportClientError(error: unknown, route: string): void {
  if (!Api.url) return;

  try {
    const { message, type, stack } = toErrorFacts(error);

    const body = {
      // The endpoint rejects an empty message, and a rejected report is exactly the blind spot
      // this reporting exists to close. `||` on purpose: an empty message needs replacing too.
      message: truncate(message, LIMITS.message) || 'Unknown error',
      type: truncate(type, LIMITS.type),
      stack: truncate(stack, LIMITS.stack),
      route: truncate(route, LIMITS.route),
      version: truncate(REACT_APP_BUILD_ID, LIMITS.version),
    };

    void fetch(url({ base: Api.url, path: `/${Api.version}/log/clientError` }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client': CLIENT_NAME },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore — reporting must never throw into the render that is already failing. toErrorFacts
    // falls back to String(error), which a thrown value with a hostile toString can turn into a
    // throw of its own, so it belongs inside this block.
  }
}

// Empty is a value the caller may legitimately hold, so only an absent one is dropped.
function truncate(value: string | undefined, max: number): string | undefined {
  if (value == null) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}
