// Mock @dfx.swiss/react to avoid ES module issues
jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('src/dto/safe.dto', () => ({}));

import {
  forgetReportedErrors,
  isChunkLoadError,
  reloadOnceForChunkError,
  reportClientError,
  toErrorFacts,
} from '../util/client-error';

jest.mock('src/config/api', () => ({ Api: { url: 'https://api.example.com', version: 'v1' } }));
jest.mock('src/version', () => ({ REACT_APP_BUILD_ID: '42-99' }));

const INGEST_URL = 'https://api.example.com/v1/log/clientError';

// react-router identifies these structurally, so the shape is what matters.
function routeErrorResponse(status: number, statusText: string): unknown {
  return { status, statusText, data: '', internal: true };
}

function sentBody(): Record<string, string | undefined> {
  return JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
}

describe('toErrorFacts', () => {
  it('reads message, type and stack off an Error', () => {
    const error = Object.assign(new Error('boom'), { name: 'ChunkLoadError', stack: 'at x' });

    expect(toErrorFacts(error)).toEqual({ message: 'boom', type: 'ChunkLoadError', stack: 'at x' });
  });

  it('describes a route error response by its status', () => {
    expect(toErrorFacts(routeErrorResponse(404, 'Not Found'))).toEqual({
      message: '404 Not Found',
      type: 'RouteErrorResponse',
    });
  });

  it('falls back to the string form of anything else', () => {
    expect(toErrorFacts('plain failure').message).toBe('plain failure');
    expect(toErrorFacts(undefined).message).toBe('undefined');
  });
});

describe('isChunkLoadError', () => {
  it.each([
    'Loading chunk 42 failed',
    'Loading CSS chunk 7 failed',
    'ChunkLoadError: something',
    'Failed to fetch dynamically imported module: https://app.example.com/static/js/1.js',
  ])('recognises the bundler wording "%s"', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  // What a stale chunk answered with the app shell actually produces: the script loads, never
  // registers the chunk, and the bundler's loader reports it as missing. Asserted on the message
  // alone, without the name, so it pins the regex rather than passing on the name check.
  it('recognises a chunk that loaded but never registered, by its message alone', () => {
    const message = 'Loading chunk 738 failed.\n(missing: https://app.example.com/static/js/738.js)';

    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('recognises the error by its name alone', () => {
    expect(isChunkLoadError(Object.assign(new Error('nondescript'), { name: 'ChunkLoadError' }))).toBe(true);
  });

  it('does not classify an unrelated error as a chunk failure', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(routeErrorResponse(404, 'Not Found'))).toBe(false);
  });

  // A reload discards whatever the customer had typed, so the cost of a false positive is high.
  // This is the wording a JSON.parse gets when a gateway, WAF or login redirect answers an API
  // call with HTML — an everyday failure that must not reload the page.
  it('does not classify a JSON response that arrived as HTML as a chunk failure', () => {
    let parseError: unknown;
    try {
      JSON.parse('<html><head>502 Bad Gateway</head></html>');
    } catch (e) {
      parseError = e;
    }

    expect(parseError).toBeInstanceOf(SyntaxError);
    expect(isChunkLoadError(parseError)).toBe(false);
  });

  it.each(["Unexpected token '<'", "expected expression, got '<'", 'Unexpected token < in JSON at position 0'])(
    'does not classify the bare syntax wording "%s" as a chunk failure',
    (message) => {
      expect(isChunkLoadError(new Error(message))).toBe(false);
    },
  );
});

describe('reportClientError', () => {
  beforeEach(() => {
    forgetReportedErrors();
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
  });

  afterEach(() => jest.restoreAllMocks());

  it('posts the error to the ingest endpoint', () => {
    reportClientError(Object.assign(new Error('boom'), { name: 'TypeError', stack: 'at buy' }), '/buy');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe(INGEST_URL);
    expect((global.fetch as jest.Mock).mock.calls[0][1]).toMatchObject({ method: 'POST', keepalive: true });
    expect(sentBody()).toEqual({
      message: 'boom',
      type: 'TypeError',
      stack: 'at buy',
      route: '/buy',
      version: '42-99',
    });
  });

  // The ingest endpoint rejects oversized fields, and a rejected report is a blind spot.
  it('truncates fields to the limits the endpoint accepts', () => {
    reportClientError(Object.assign(new Error('m'.repeat(900)), { stack: 's'.repeat(5000) }), '/r'.repeat(400));

    expect(sentBody().message).toHaveLength(500);
    expect(sentBody().stack).toHaveLength(4000);
    expect(sentBody().route).toHaveLength(500);
  });

  it('swallows a failing report instead of raising a second error', () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as jest.Mock;

    expect(() => reportClientError(new Error('boom'), '/buy')).not.toThrow();
  });

  it('swallows a fetch that throws synchronously', () => {
    global.fetch = jest.fn().mockImplementation(() => {
      throw new Error('blocked');
    }) as jest.Mock;

    expect(() => reportClientError(new Error('boom'), '/buy')).not.toThrow();
  });

  // toErrorFacts falls back to String(error), which a hostile toString can turn into a throw.
  it('swallows a thrown value whose string conversion throws', () => {
    const hostile = {
      toString: () => {
        throw new Error('nope');
      },
    };

    expect(() => reportClientError(hostile, '/buy')).not.toThrow();
  });

  it('identifies the app to the API', () => {
    reportClientError(new Error('boom'), '/buy');

    expect((global.fetch as jest.Mock).mock.calls[0][1].headers).toMatchObject({ 'x-client': 'dfx-services' });
  });

  // The endpoint requires a non-empty message; without a substitute the whole report is rejected
  // and the failure stays invisible, which is the very gap this reporting closes.
  it('substitutes a message when the error carries none', () => {
    reportClientError(new Error(''), '/buy');

    expect(sentBody().message).toBe('Unknown error');
  });

  it('keeps an empty stack out of the payload rather than sending an empty string', () => {
    reportClientError(Object.assign(new Error('boom'), { stack: undefined }), '/buy');

    expect(sentBody()).not.toHaveProperty('stack');
  });
});

describe('reloadOnceForChunkError', () => {
  let reload: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    reload = jest.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true });
  });

  it('reloads on the first chunk failure', () => {
    reloadOnceForChunkError();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload again within the guard window', () => {
    reloadOnceForChunkError();
    reloadOnceForChunkError();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads again once the guard window has passed', () => {
    localStorage.setItem('dfx.chunkReloadAt', String(Date.now() - 31000));

    reloadOnceForChunkError();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  // Embedded contexts can block storage; without the guard a reload there would loop.
  it('skips the reload when storage is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    reloadOnceForChunkError();

    expect(reload).not.toHaveBeenCalled();
  });

  // The widget and library builds run on a third party's page, where window is theirs. Reloading
  // it over a deploy of ours would throw away state that has nothing to do with us. The module
  // is loaded in isolation because marking it is a one-way switch.
  it('does not reload the host page once marked as embedded', () => {
    jest.isolateModules(() => {
      const clientError = jest.requireActual('../util/client-error');

      clientError.markEmbedded();
      clientError.reloadOnceForChunkError();

      expect(reload).not.toHaveBeenCalled();
    });
  });

  it('still reloads when not embedded', () => {
    jest.isolateModules(() => {
      const clientError = jest.requireActual('../util/client-error');

      clientError.reloadOnceForChunkError();

      expect(reload).toHaveBeenCalledTimes(1);
    });
  });

  // A reload alone re-reads index.html but not the stored answer for the chunk, and the chunk URL
  // is stable across builds. Without replacing that stored copy the customer gets the same bad
  // answer back on every attempt, for as long as it is considered fresh.
  it('replaces the stored copy of the failing chunk before reloading', async () => {
    const fetchMock = jest.fn().mockResolvedValue(new Response('', { status: 404 }));
    global.fetch = fetchMock as any;

    reloadOnceForChunkError(
      Object.assign(new Error('Loading chunk 2688 failed.\n(error: http://localhost/static/js/2688.abc.chunk.js)'), {
        name: 'ChunkLoadError',
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith('http://localhost/static/js/2688.abc.chunk.js', {
      cache: 'reload',
      credentials: 'omit',
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads even when replacing the stored copy fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as any;

    reloadOnceForChunkError(
      Object.assign(new Error('Loading chunk 7 failed.\n(error: http://localhost/static/js/7.abc.chunk.js)'), {
        name: 'ChunkLoadError',
      }),
    );

    await Promise.resolve();
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  // The message is derived from an error object, which an embedded or third-party bundler could
  // supply. Repairing an address on someone else's host is not ours to do.
  it('ignores a chunk address on another origin and just reloads', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as any;

    reloadOnceForChunkError(new Error('Loading chunk 9 failed.\n(error: https://evil.example/x.chunk.js)'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

// The router can remount the same route repeatedly, and each remount is a fresh component. A guard
// that lives in the component therefore cannot hold -- measured in a real browser, one page
// produced 19-30 reports per second this way, while the customer saw a single broken screen.
describe('repeat reports', () => {
  beforeEach(() => {
    forgetReportedErrors();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-01T10:00:00Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('reports the same failure only once within the window', () => {
    const error = Object.assign(new Error('Loading chunk 2688 failed.'), { name: 'ChunkLoadError' });

    reportClientError(error, '/buy');
    reportClientError(error, '/buy');
    reportClientError(error, '/buy');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('still reports the same failure on a different route', () => {
    const error = Object.assign(new Error('Loading chunk 2688 failed.'), { name: 'ChunkLoadError' });

    reportClientError(error, '/buy');
    reportClientError(error, '/sell');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('reports a different failure on the same route', () => {
    reportClientError(new Error('one'), '/buy');
    reportClientError(new Error('two'), '/buy');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('reports again once the window has passed', () => {
    const error = new Error('same');

    reportClientError(error, '/buy');
    jest.setSystemTime(new Date('2026-08-01T10:01:01Z'));
    reportClientError(error, '/buy');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

// The wiring every entry point relies on, and the part a unit test of the pieces does not cover:
// which property of which event carries the error.
describe('installChunkErrorHandling', () => {
  let reload: jest.Mock;
  let installed: Array<[string, EventListener]>;

  // window outlives each test, so the listeners have to be taken back off it — otherwise every
  // later test fires through the handlers of the earlier ones as well.
  function install(embed = false): void {
    const add = window.addEventListener.bind(window);
    jest.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      installed.push([type, listener as EventListener]);
      add(type, listener, options);
    });

    jest.isolateModules(() => {
      const clientError = jest.requireActual('../util/client-error');
      if (embed) clientError.markEmbedded();
      clientError.installChunkErrorHandling();
    });
  }

  function fire(type: 'error' | 'unhandledrejection', props: Record<string, unknown>): void {
    window.dispatchEvent(Object.assign(new Event(type), props));
  }

  // The test environment registers listeners of its own, so only the two channels matter here.
  function ourListeners(): string[] {
    return installed.map(([type]) => type).filter((type) => ['error', 'unhandledrejection'].includes(type));
  }

  beforeEach(() => {
    localStorage.clear();
    installed = [];
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as jest.Mock;
    reload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/buy', reload },
      writable: true,
    });
  });

  afterEach(() => {
    installed.forEach(([type, listener]) => window.removeEventListener(type, listener));
    jest.restoreAllMocks();
  });

  it('recovers a chunk failure reported as an error event', () => {
    install();

    fire('error', { error: Object.assign(new Error('Loading chunk 42 failed'), { name: 'ChunkLoadError' }) });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // Some engines deliver only the message, with no error object attached.
  it('recovers a chunk failure carried as a bare message', () => {
    install();

    fire('error', { message: 'Loading chunk 42 failed' });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('recovers a chunk failure from a rejected promise', () => {
    install();

    fire('unhandledrejection', { reason: new Error('Loading chunk 42 failed') });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('ignores an error that is not a chunk failure', () => {
    install();

    fire('error', { error: new Error('Cannot read properties of undefined') });

    expect(reload).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // These listeners are page-wide, and embedded the page is the host's. A host running its own
  // bundler would have its chunk failures filed as ours. Asserted on the registration rather than
  // by firing an event, because an error event with nothing listening fails the test run itself.
  it('installs no listeners when embedded', () => {
    install(true);

    expect(ourListeners()).toHaveLength(0);
  });

  it('installs listeners for both channels when not embedded', () => {
    install();

    expect(ourListeners().sort()).toEqual(['error', 'unhandledrejection']);
  });
});
