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

  // Restricted to successful responses. An HTML error page is a failure with its own status, and
  // reporting it as 404 would state that the asset is permanently gone on the strength of what may
  // be a passing fault. `ok` rather than `=== 200` so a partial response cannot slip past.
  if (response.ok && (response.headers.get('content-type') ?? '').includes('text/html')) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        // The next deploy may add this path back, so the absence must not be cached.
        'cache-control': 'no-store',
      },
    });
  }

  return response;
}
