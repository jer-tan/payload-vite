import type { Express, Request as ExpressRequest, Response as ExpressResponse } from 'express'
import type { SanitizedConfig } from 'payload'
import type { ViteDevServer } from 'vite'

import express from 'express'
import { handleEndpoints } from 'payload'

import { graphqlHandler, graphqlPlaygroundHandler } from './routes/graphql.js'
import { adminHandler, adminHtmlHandler } from './routes/admin.js'

export type PayloadViteServerOptions = {
  /** Path to admin panel entry file for Vite */
  adminEntryPath?: string
  /** Payload config (can be a promise) */
  config: Promise<SanitizedConfig> | SanitizedConfig
  /** Enable Vite dev middleware (HMR). Set false in production. */
  dev?: boolean
  /** Express app to attach to. If not provided, one will be created. */
  express?: Express
  /** Port for the server */
  port?: number
  /** Path to Vite client build output (for production) */
  viteBuildDir?: string
}

/**
 * Convert an Express request to a Web Fetch API Request object.
 */
function expressToFetchRequest(req: ExpressRequest): Request {
  const protocol = req.protocol
  const host = req.get('host') || 'localhost'
  const url = `${protocol}://${host}${req.originalUrl}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.append(key, v)
        }
      } else {
        headers.set(key, value)
      }
    }
  }

  const init: RequestInit = {
    headers,
    method: req.method,
  }

  // Only attach body for methods that support it
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    // If Express has already parsed the body, serialize it back
    if (req.body !== undefined && req.body !== null) {
      const contentType = req.get('content-type') || ''

      if (contentType.includes('application/json')) {
        init.body = JSON.stringify(req.body)
      } else if (contentType.includes('multipart/form-data')) {
        // For multipart, we need the raw body - pass through the readable stream
        // Express body-parser should NOT parse multipart; let Payload handle it
        init.body = req as unknown as ReadableStream
        // @ts-expect-error duplex required for streaming body
        init.duplex = 'half'
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        init.body = new URLSearchParams(req.body as Record<string, string>).toString()
      } else if (typeof req.body === 'string') {
        init.body = req.body
      } else if (Buffer.isBuffer(req.body)) {
        init.body = req.body
      }
    } else if (req.readable) {
      // Raw body stream for unparsed requests
      const { Readable } = await import('node:stream')
      init.body = Readable.toWeb(req) as ReadableStream
      // @ts-expect-error duplex required for streaming body
      init.duplex = 'half'
    }
  }

  return new Request(url, init)
}

/**
 * Send a Web Fetch API Response back through Express.
 */
async function sendFetchResponse(fetchResponse: Response, res: ExpressResponse): Promise<void> {
  res.status(fetchResponse.status)

  fetchResponse.headers.forEach((value, key) => {
    // Skip content-encoding as Express handles this
    if (key.toLowerCase() !== 'content-encoding') {
      res.setHeader(key, value)
    }
  })

  if (fetchResponse.body) {
    const reader = fetchResponse.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        res.write(value)
      }
    } finally {
      reader.releaseLock()
    }
    res.end()
  } else {
    res.end()
  }
}

/**
 * Create and configure a Payload CMS server powered by Express + Vite.
 */
export async function createPayloadViteServer(
  options: PayloadViteServerOptions,
): Promise<{ app: Express; vite?: ViteDevServer }> {
  const {
    adminEntryPath,
    config: configPromise,
    dev = process.env.NODE_ENV !== 'production',
    port = 3000,
    viteBuildDir = './dist/admin',
  } = options

  const app = options.express ?? express()
  const config = await configPromise

  const apiRoute = config.routes.api || '/api'
  const adminRoute = config.routes.admin || '/admin'
  const graphqlPath = config.routes.graphQL || '/graphql'

  // --- Body parsing for non-multipart ---
  // Don't parse multipart; Payload handles file uploads internally
  app.use(express.json({ limit: '5mb' }))
  app.use(express.urlencoded({ extended: true, limit: '5mb' }))

  // --- Static files ---
  app.use('/media', express.static('./media'))

  // --- REST API routes ---
  // Matches all routes under /api/*
  app.all(`${apiRoute}/*splat`, async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const fetchRequest = await expressToFetchRequest(req)
      const fetchResponse = await handleEndpoints({
        config: configPromise,
        request: fetchRequest,
      })
      await sendFetchResponse(fetchResponse, res)
    } catch (err) {
      console.error('REST API error:', err)
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' })
      }
    }
  })

  // --- GraphQL routes ---
  if (!config.graphQL?.disable) {
    const gqlFullPath = `${apiRoute}${graphqlPath}`

    app.post(gqlFullPath, async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const fetchRequest = await expressToFetchRequest(req)
        const fetchResponse = await graphqlHandler(configPromise, fetchRequest)
        await sendFetchResponse(fetchResponse, res)
      } catch (err) {
        console.error('GraphQL error:', err)
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal Server Error' })
        }
      }
    })

    app.get(`${gqlFullPath}/playground`, async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const fetchRequest = await expressToFetchRequest(req)
        const fetchResponse = await graphqlPlaygroundHandler(configPromise, fetchRequest)
        await sendFetchResponse(fetchResponse, res)
      } catch (err) {
        console.error('GraphQL Playground error:', err)
        if (!res.headersSent) {
          res.status(500).send('Error loading playground')
        }
      }
    })
  }

  // --- Admin Panel ---
  let vite: ViteDevServer | undefined

  if (dev) {
    // Development: Use Vite dev server as middleware for HMR
    const { createServer: createViteServer } = await import('vite')
    vite = await createViteServer({
      appType: 'spa',
      root: process.cwd(),
      server: { middlewareMode: true },
    })
    app.use(vite.middlewares)
  } else {
    // Production: Serve built admin assets
    const path = await import('node:path')
    app.use(adminRoute, express.static(path.resolve(viteBuildDir)))
  }

  // Admin HTML fallback - serves the SPA for all admin routes
  app.get(`${adminRoute}*splat`, async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const html = await adminHtmlHandler({
        adminEntryPath: adminEntryPath || './src/admin/entry.tsx',
        adminRoute,
        config,
        dev,
        vite,
      })
      res.setHeader('Content-Type', 'text/html')
      res.send(html)
    } catch (err) {
      console.error('Admin panel error:', err)
      if (vite) {
        vite.ssrFixStacktrace(err as Error)
      }
      if (!res.headersSent) {
        res.status(500).send('Error loading admin panel')
      }
    }
  })

  return { app, vite }
}
