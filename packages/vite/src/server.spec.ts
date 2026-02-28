import { describe, expect, it } from 'vitest'

// Inline the tested logic to avoid Express peer dependency in unit test context.
// This mirrors the implementation in packages/vite/src/server.ts.

function buildFetchRequestFromMock(mock: {
  body?: string
  contentType?: string
  headers?: Record<string, string>
  method?: string
  originalUrl?: string
  protocol?: string
}): Request {
  const {
    body,
    contentType,
    headers = {},
    method = 'GET',
    originalUrl = '/api/test',
    protocol = 'http',
  } = mock

  const host = 'localhost:3000'
  const url = `${protocol}://${host}${originalUrl}`

  const fetchHeaders = new Headers()
  fetchHeaders.set('host', host)
  for (const [k, v] of Object.entries(headers)) {
    fetchHeaders.set(k, v)
  }
  if (contentType) {
    fetchHeaders.set('content-type', contentType)
  }

  const init: RequestInit = { headers: fetchHeaders, method }
  if (method !== 'GET' && method !== 'HEAD' && body !== undefined) {
    init.body = body
  }

  return new Request(url, init)
}

describe('@payloadcms/vite: Request conversion', () => {
  it('builds a GET request with the correct URL', () => {
    const req = buildFetchRequestFromMock({
      method: 'GET',
      originalUrl: '/api/collections',
      protocol: 'http',
    })

    expect(req.method).toBe('GET')
    expect(req.url).toBe('http://localhost:3000/api/collections')
    expect(req.body).toBeNull()
  })

  it('builds a POST request with a JSON body', () => {
    const payload = JSON.stringify({ email: 'test@example.com', password: 'secret' })
    const req = buildFetchRequestFromMock({
      body: payload,
      contentType: 'application/json',
      method: 'POST',
      originalUrl: '/api/users/login',
    })

    expect(req.method).toBe('POST')
    expect(req.headers.get('content-type')).toBe('application/json')
  })

  it('passes query params through in the URL', () => {
    const req = buildFetchRequestFromMock({
      method: 'GET',
      originalUrl: '/api/collections/posts?limit=10&page=1',
    })

    const parsedUrl = new URL(req.url)

    expect(parsedUrl.searchParams.get('limit')).toBe('10')
    expect(parsedUrl.searchParams.get('page')).toBe('1')
  })

  it('preserves request headers', () => {
    const req = buildFetchRequestFromMock({
      headers: { authorization: 'Bearer test-token', 'x-custom': 'value' },
      method: 'GET',
      originalUrl: '/api/me',
    })

    expect(req.headers.get('authorization')).toBe('Bearer test-token')
    expect(req.headers.get('x-custom')).toBe('value')
  })

  it('does not attach a body for GET requests', () => {
    const req = buildFetchRequestFromMock({
      body: 'should-be-ignored',
      method: 'GET',
    })

    expect(req.body).toBeNull()
  })
})

describe('@payloadcms/vite: Admin HTML generation', () => {
  it('injects admin route config script into HTML', () => {
    const adminRoute = '/admin'
    const apiRoute = '/api'
    const serverURL = 'http://localhost:3000'

    const html = `<!DOCTYPE html>
<html>
<head><!--payload-head--></head>
<body><div id="app"></div><!--payload-scripts--></body>
</html>`

    const configScript = `<script>
    window.__PAYLOAD_ADMIN_ROUTE__ = ${JSON.stringify(adminRoute)};
    window.__PAYLOAD_API_ROUTE__ = ${JSON.stringify(apiRoute)};
    window.__PAYLOAD_SERVER_URL__ = ${JSON.stringify(serverURL)};
  </script>`

    const result = html.replace('<!--payload-head-->', configScript)

    expect(result).toContain(`window.__PAYLOAD_ADMIN_ROUTE__ = "/admin"`)
    expect(result).toContain(`window.__PAYLOAD_API_ROUTE__ = "/api"`)
    expect(result).toContain(`window.__PAYLOAD_SERVER_URL__ = "http://localhost:3000"`)
    expect(result).toContain('<div id="app"></div>')
  })
})
