/**
 * Answers a request for a build asset that does not exist with a 404 instead of the app shell.
 *
 * Without this, an absent asset is answered with the app shell and status 200: Pages serves
 * index.html for any path with no file behind it, which public/_headers then stamps with the cache
 * lifetime meant for fingerprinted assets. A client asking for a chunk that a later deploy replaced
 * therefore does not get a failure it can recover from -- it gets an HTML page parsed as
 * JavaScript, cached under the chunk's own URL.
 *
 * Nothing served under the paths this runs on is ever HTML, so the content type of the response is
 * what separates a real asset from that fallback. Both are status 200; only the type differs.
 *
 * public/_routes.json restricts this to those paths. Every other request -- the app shell, deep
 * links, the root -- is served statically and never reaches this code.
 */
export async function onRequest(context) {
  const response = await context.env.ASSETS.fetch(context.request);

  // Status 200 is part of what identifies the fallback. An HTML error page -- a gateway or origin
  // failure rendered as HTML -- must pass through as the status it is: rewriting it to 404 would
  // report a temporary outage as an asset that is gone for good, and send the client off to reload
  // instead of retry.
  if (response.status === 200 && (response.headers.get('content-type') ?? '').includes('text/html')) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        // Never let the absence of an asset be cached: the next deploy may well add it back under
        // the same URL, and a cached 404 would outlive the problem it reports.
        'cache-control': 'no-store',
      },
    });
  }

  return response;
}
