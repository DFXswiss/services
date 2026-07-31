import { isRouteErrorResponse } from 'react-router-dom';
import { Api } from 'src/config/api';
import { REACT_APP_BUILD_ID } from 'src/version';
import { url } from './utils';

// Kept in sync with the field limits of the ingest endpoint, so a long message is trimmed here
// instead of being rejected there — a dropped report is a blind spot.
const LIMITS = { message: 500, type: 100, stack: 4000, route: 500, version: 50 };

const CHUNK_RELOAD_KEY = 'dfx.chunkReloadAt';
const CHUNK_RELOAD_WINDOW = 30000;

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

// A chunk request that fails is reported by the bundler as a ChunkLoadError. When a stale chunk
// URL is answered with the app shell instead, the HTML is parsed as a script and the browser
// reports a syntax error or a MIME type rejection — the same root cause, three wordings.
export function isChunkLoadError(error: unknown): boolean {
  const { message, type } = toErrorFacts(error);

  return (
    type === 'ChunkLoadError' ||
    /Loading (CSS )?chunk [\w-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module/i.test(message) ||
    /Unexpected token '<'|is not a valid JavaScript MIME type|expected expression, got '<'/i.test(message)
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

  const { message, type, stack } = toErrorFacts(error);

  const body = {
    message: truncate(message, LIMITS.message),
    type: truncate(type, LIMITS.type),
    stack: truncate(stack, LIMITS.stack),
    route: truncate(route, LIMITS.route),
    version: truncate(REACT_APP_BUILD_ID, LIMITS.version),
  };

  try {
    void fetch(url({ base: Api.url, path: `/${Api.version}/log/clientError` }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore — reporting must never throw into the render that is already failing
  }
}

function truncate(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}
