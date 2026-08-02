import { isRouteErrorResponse } from 'react-router-dom';
import { Api } from 'src/config/api';
import { REACT_APP_BUILD_ID } from 'src/version';
import { url } from './utils';

// Must match the field limits of the ingest endpoint, so a long message is trimmed here instead of
// being rejected there — a dropped report is a blind spot. Nothing enforces this across the two
// repositories, so a change to those limits has to be mirrored here by hand.
const LIMITS = { message: 500, type: 100, stack: 4000, route: 500, version: 50 };

const CHUNK_RELOAD_KEY = 'dfx.chunkReloadAt';
const CHUNK_RELOAD_WINDOW = 30000;

// The bundler names the failing asset in its message: `(error: <url>)` or `(missing: <url>)` for a
// chunk, and a trailing address for a dynamic import. Both forms allow a relative address, since
// what appears here is whatever the build was configured to request.
const CHUNK_URL_PATTERNS = [/\((?:error|missing):\s*([^\s)]+)\)/i, /imported module:\s*([^\s]+)/i];

// How long the repair may take before the reload goes ahead regardless. A request that never
// settles must not cost the customer their recovery — before this existed, the reload was
// immediate, and it has to stay at least as reliable as that.
const REPAIR_BUDGET = 2000;

// Reporting the same failure again tells us nothing and costs the customer a request. The router
// can remount a route repeatedly, and every remount builds a fresh component instance -- so a
// guard that lives in the component cannot hold. This one outlives the mount.
const RECENT_REPORTS = new Map<string, number>();
const REPORT_DEDUP_WINDOW = 60000;

// Identifies this app to the API, which logs it alongside the error. Without it every report
// from here is filed as an unknown client.
const CLIENT_NAME = 'dfx-services';

export interface ErrorFacts {
  message: string;
  type?: string;
  stack?: string;
}

// Nothing read from a thrown value may cost the report. Classifying it already touches properties
// that can be getters, and the fallback below runs a toString this code did not write — so the
// whole reading is guarded, not just the fields.
//
// What survives the failure is still read: the message is what the chunk classification matches
// on, so giving up on it would cost the customer their recovery as well as the record.
export function toErrorFacts(error: unknown): ErrorFacts {
  try {
    return factsOf(error);
  } catch {
    // The same two sources factsOf reads a message from, in the same order — only guarded, since
    // whatever broke the reading above may break them too.
    return {
      message: textOf(() => (error as { message?: unknown })?.message) || textOf(() => String(error)) || '',
      type: nameOf(error),
    };
  }
}

function factsOf(error: unknown): ErrorFacts {
  if (isRouteErrorResponse(error)) {
    // Thrown when no route matches the URL, and by loaders returning a Response.
    return { message: `${error.status} ${error.statusText}`, type: 'RouteErrorResponse' };
  }

  // Read as text or not at all. These fields come off a value someone else threw, and an Error is
  // free to carry anything under them — a name that is an object serialises nowhere, and the report
  // would be lost to the very failure it describes.
  if (error instanceof Error) {
    return {
      message: textOf(() => error.message) ?? '',
      type: nameOf(error),
      stack: textOf(() => error.stack),
    };
  }

  // Not every thrown value is an Error, and one that is not can still carry a message — which
  // String() would reduce to [object Object]. So the field is tried first, and the string form is
  // what is left when there is none. `||` on purpose: an empty message is no more use than a
  // missing one, and the string form may still name the failure.
  return { message: textOf(() => (error as { message?: unknown })?.message) || String(error) };
}

// Both the reading and the value are untrusted: the property can be a getter that throws, and what
// it returns can be anything. A number, bigint or boolean still says something and is written out;
// everything else is dropped, which is a smaller loss than the report it would otherwise take with
// it — a value that serialises nowhere makes composing the payload throw.
function textOf(read: () => unknown): string | undefined {
  try {
    const value = read();
    if (typeof value === 'string') return value;

    // Converting these cannot throw, unlike String() on an object with a hostile toString.
    return typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean'
      ? String(value)
      : undefined;
  } catch {
    return undefined;
  }
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
  // The name first: it is the cheaper signal. Deriving the message is the riskier step, since it
  // reads more of a value this code did not create — but both are guarded at the source now, so
  // neither can throw here. That matters because classification is the first thing the global
  // handler does with a thrown value: a throw would cost the recovery that follows, leaving the
  // failure classified as nothing at all and the customer on the broken page.
  if (nameOf(error) === 'ChunkLoadError') return true;

  return /Loading (CSS )?chunk [\w-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module/i.test(
    toErrorFacts(error).message,
  );
}

function nameOf(error: unknown): string | undefined {
  return textOf(() => (error as { name?: unknown })?.name);
}

// The widget and library builds run inside someone else's page, where `window` belongs to the
// host. Reloading it would discard state that has nothing to do with us — their forms, their cart,
// their scroll position — over a deploy of ours. Those builds mark themselves, and recovery there
// falls back to reporting the failure without reloading.
let embedded = false;

export function markEmbedded(): void {
  embedded = true;
}

export function isEmbedded(): boolean {
  return embedded;
}

// A new deploy replaces the content-hashed chunks, so a tab left open across one can request a
// chunk that no longer exists. Reload once to pick up the new chunks. The guard lives in
// localStorage (it survives the sessionStorage.clear() on session/login URLs) and is time-boxed,
// so a persistent failure reloads at most once per window instead of looping. Storage access is
// wrapped because embedded/iframe contexts can block it.
export function reloadOnceForChunkError(error?: unknown): void {
  if (embedded) return;

  try {
    const last = Number(localStorage.getItem(CHUNK_RELOAD_KEY) ?? 0);
    if (Date.now() - last < CHUNK_RELOAD_WINDOW) return;
    localStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    return; // storage blocked (e.g. embedded iframe) — skip to avoid an unguarded reload loop
  }

  const chunkUrl = chunkUrlOf(error);

  // A plain reload fetches index.html anew but leaves the stored answer for the chunk itself
  // untouched, and a chunk URL stays the same as long as its content does. A customer holding a
  // bad answer under that URL therefore gets it back on every attempt, for as long as the stored
  // copy is considered fresh -- which for these assets is a year.
  //
  // Requesting it with `cache: 'reload'` replaces the stored copy: the browser must go to the
  // network, and the request carries no-cache, so intermediate caches revalidate too. Reload only
  // after that has settled, whichever way it went -- the reload is the recovery, and it must not
  // be skipped because the repair failed.
  if (!chunkUrl) {
    window.location.reload();
    return;
  }

  // The reload must happen even if the repair hangs, so it is bounded by a timer as well as by the
  // request settling — whichever comes first, and only once.
  let reloaded = false;
  const reloadOnce = (): void => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  };

  window.setTimeout(reloadOnce, REPAIR_BUDGET);

  void fetch(chunkUrl, { cache: 'reload', credentials: 'omit' })
    .catch(() => undefined)
    .then(reloadOnce);
}

// The address of the asset a bundler failure names, resolved and confined to our own origin.
export function chunkUrlOf(error: unknown): string | undefined {
  if (error == null) return undefined;

  // Every step here reads from a value we were handed: the property can be a getter that throws,
  // and deriving the message runs String() on it, which a hostile toString can turn into a throw.
  // Failing to find an address is fine -- the caller reloads without repairing -- but throwing is
  // not: the reload guard has already been written by then, so the customer would be left with
  // neither a repair nor a reload until it expires.
  try {
    // webpack puts the address on the error itself, which beats reading it back out of prose.
    const request = (error as { request?: unknown }).request;
    const raw = typeof request === 'string' && request ? request : addressInMessage(error);
    if (!raw) return undefined;

    // Resolved against the current document, so a relative address — which is what a build with a
    // relative public path emits — is handled like an absolute one.
    const resolved = new URL(raw, window.location.href);

    // Own origin only: this address comes out of an error object, and an embedded or third-party
    // bundler could otherwise point the repair at someone else's host.
    return resolved.origin === window.location.origin ? resolved.href : undefined;
  } catch {
    return undefined;
  }
}

function addressInMessage(error: unknown): string | undefined {
  const { message } = toErrorFacts(error);

  for (const pattern of CHUNK_URL_PATTERNS) {
    const match = pattern.exec(message);
    if (match) return match[1];
  }

  return undefined;
}

// Clears what this module remembers between reports. Only a test needs this: in a document the
// state is meant to live for as long as the document does, which is the whole point of it.
export function forgetReportedErrors(): void {
  RECENT_REPORTS.clear();
}

// True when this exact failure was already reported from this document within the window. Keeps
// the map bounded by dropping expired entries on the way through, so a long session cannot grow it
// without limit.
function isRepeatReport(signature: string): boolean {
  const now = Date.now();

  RECENT_REPORTS.forEach((at, key) => {
    if (now - at >= REPORT_DEDUP_WINDOW) RECENT_REPORTS.delete(key);
  });

  const last = RECENT_REPORTS.get(signature);
  if (last != null && now - last < REPORT_DEDUP_WINDOW) return true;

  RECENT_REPORTS.set(signature, now);
  return false;
}

// Reports an error the user actually saw. Fire-and-forget: a failing report must never surface as
// a second error. `keepalive` lets the request outlive the reload that may follow it.
//
// The account is passed in rather than read here, and stays optional: this function also runs from
// the window listeners below and from failures during startup, where there is no session to read —
// which is exactly the case this reporting exists to catch. The caller that has one hands it over;
// the callers that do not report without it.
export function reportClientError(error: unknown, route: string, accountId?: number): void {
  if (!Api.url) return;

  try {
    const { message, type, stack } = toErrorFacts(error);

    // Only sent when it has the shape of an account id — a positive safe integer, which is what
    // the ingest endpoint takes. Anything else would only add noise to the record. Absent whenever
    // nobody is signed in.
    const account = accountId != null && Number.isSafeInteger(accountId) && accountId > 0 ? accountId : undefined;

    // Deduplicated here rather than at the call site, so every caller is covered by the same rule.
    // Without it a remount loop reports the same failure tens of times per second: the customer
    // sees one broken page while the API sees a flood, and the rate limit then hides the very
    // reports this exists to collect.
    //
    // The account belongs in the signature: the same failure under two accounts is two customers,
    // and dropping the second would hide exactly the one this reporting exists to find.
    //
    // Composed as JSON rather than joined by a separator, which a message is free to contain: two
    // different failures could otherwise produce the same signature, and the second would be
    // dropped as a repeat of the first.
    if (isRepeatReport(JSON.stringify([type ?? null, message, route, account ?? null]))) return;

    const body = {
      // The endpoint rejects an empty message, and a rejected report is exactly the blind spot
      // this reporting exists to close. `||` on purpose: an empty message needs replacing too.
      message: truncate(message, LIMITS.message) || 'Unknown error',
      type: truncate(type, LIMITS.type),
      stack: truncate(stack, LIMITS.stack),
      route: truncate(route, LIMITS.route),
      version: truncate(REACT_APP_BUILD_ID, LIMITS.version),
      accountId: account,
    };

    void fetch(url({ base: Api.url, path: `/${Api.version}/log/clientError` }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-client': CLIENT_NAME },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore — reporting must never throw into the render that is already failing. Reading the
    // thrown value is guarded on its own, so what remains here is the rest: composing the payload
    // and handing it to fetch.
  }
}

// Empty is a value the caller may legitimately hold, so only an absent one is dropped.
// Catches a chunk failure that reaches neither Suspense nor the router's error boundary — during
// startup, or from code React does not render, such as an import() in a click handler. Chunk
// failures inside the router are handled by the error screen, which is where React hands them;
// these listeners never see those.
//
// Called from index.tsx, the standalone app's entry point. The embedded builds deliberately do not
// call it: these listeners are page-wide, and there the page is the host's — the widget is a web
// component in their window, not an iframe — so on a host that ships its own bundler they would
// catch that bundler's chunk failures and file them as ours. The guard below keeps that true even
// if a future entry point calls this without checking.
export function installChunkErrorHandling(): void {
  if (embedded) return;

  const handle = (error: unknown): void => {
    if (!isChunkLoadError(error)) return;

    reportClientError(error, window.location.pathname);
    reloadOnceForChunkError(error);
  };

  window.addEventListener('error', (event) => handle(event?.error ?? event?.message));
  window.addEventListener('unhandledrejection', (event) => handle(event?.reason));
}

function truncate(value: string | undefined, max: number): string | undefined {
  if (value == null) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}
