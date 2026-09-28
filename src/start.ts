import { createMiddleware, createStart } from '@tanstack/react-start'

import { isTrustedMutation } from './lib/csrf'
import { applySecurityHeaders, securityHeadersInit } from './lib/securityHeaders'
import { requireUser } from './server/auth'

/**
 * Enforces authentication at the entry of every request (SSR, server functions, server routes).
 * Always done in global middleware so no individual route forgets it.
 *
 * State-changing requests check Origin first. Even if the Access cookie is sent from another site,
 * only the same Origin gets through. Authentication is enforced after that.
 */
const authMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (
    !isTrustedMutation({
      method: request.method,
      origin: request.headers.get('origin'),
      requestUrl: request.url,
    })
  ) {
    throw new Response('この操作は許可されていません。', {
      status: 403,
      headers: securityHeadersInit({ 'content-type': 'text/plain; charset=utf-8' }),
    })
  }

  const user = await requireUser(request)
  try {
    const result = await next({ context: { user } })
    applySecurityHeaders(result.response.headers)
    return result
  } catch (e) {
    // When a route handler exits with throw new Response(...) (e.g. 404), unlike a normal
    // return it bypasses this point and would be served without the security headers.
    if (e instanceof Response) {
      applySecurityHeaders(e.headers)
      throw e
    }
    throw e
  }
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [authMiddleware],
  }
})
