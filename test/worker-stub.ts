/**
 * Empty Worker for server-layer tests.
 *
 * main in wrangler.jsonc points to an entry inside the TanStack Start package, which the
 * test runner cannot resolve. Tests only need bindings such as D1, not the app itself,
 * so this replaces the entry point.
 */
export default {
  fetch(): Response {
    return new Response('test stub', { status: 404 })
  },
}
