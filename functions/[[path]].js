/**
 * Answers a request for a build asset that does not exist with a 404 instead of the app shell.
 *
 * A path with no file behind it is answered with index.html and status 200, and public/_headers
 * stamps anything under /static/* with the cache lifetime meant for fingerprinted assets. A client
 * asking for a chunk that a later deploy replaced therefore receives an HTML page to parse as
 * JavaScript, cached under the chunk's own URL.
 *
 * Nothing served under the paths in public/_routes.json is HTML, so the content type separates a
 * real asset from that fallback. Every other request is served statically and never reaches here.
 */
export async function onRequest(context) {
  const response = await context.env.ASSETS.fetch(context.request);

  // A conditional request can be answered 304 against the fallback's own validator, which would
  // leave a client that stored the app shell under an asset URL holding on to it. A 304 carries
  // neither body nor content type, so the only way to see what the path holds is to ask again
  // without the conditions. This costs a second lookup on revalidation only -- a client whose copy
  // is still fresh sends no request at all, and never reaches this code.
  if (response.status === 304) {
    return await resolveConditional(context);
  }

  // Restricted to successful responses. An HTML error page is a failure with its own status, and
  // reporting it as 404 would state that the asset is permanently gone on the strength of what may
  // be a passing fault. `ok` rather than `=== 200` so a partial response cannot slip past.
  if (isFallback(response)) return notFound();

  return response;
}

// Repeats the lookup without the conditions, to find out whether the 304 stood for a real asset or
// for the fallback. A real asset keeps its 304: the client's copy is valid and needs no body.
async function resolveConditional(context) {
  const unconditional = new Request(context.request);
  unconditional.headers.delete('if-none-match');
  unconditional.headers.delete('if-modified-since');

  const response = await context.env.ASSETS.fetch(unconditional);

  if (isFallback(response)) return notFound();

  // Only a successful lookup says the client's copy is still good. Anything else -- a failure, a
  // redirect -- is passed on as itself: answering 304 there would confirm a cached entry on the
  // strength of a request that never established what the path holds.
  if (!response.ok) return response;

  return new Response(null, { status: 304, headers: response.headers });
}

function isFallback(response) {
  if (!response.ok) return false;

  // Real assets from ASSETS always carry a platform-set content-type. An ok response
  // without one has no guarantee it is a real file — treat it like a fallback, not as
  // safe to pass through.
  const contentType = response.headers.get('content-type');
  if (contentType === null) return true;

  return contentType.split(';')[0].trim().toLowerCase() === 'text/html';
}

function notFound() {
  return new Response('Not found', {
    status: 404,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      // The next deploy may add this path back, so the absence must not be cached.
      'cache-control': 'no-store',
    },
  });
}
