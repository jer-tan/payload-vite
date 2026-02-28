/**
 * Production Express server entry point for Payload CMS.
 * This replaces the Next.js server and serves both the REST/GraphQL APIs
 * and the admin panel.
 *
 * Usage:
 *   NODE_ENV=production node --import tsx/esm server.ts
 *   # or after build:
 *   node dist/server.js
 */
import { loadEnv } from 'payload/node'

// Load environment variables before anything else
loadEnv()

import { createPayloadViteServer } from '@payloadcms/vite'

const port = parseInt(process.env.PORT || '3000', 10)

async function start() {
  // Import the Payload config
  // Users should update this path to their own config
  const configPath = process.env.PAYLOAD_CONFIG_PATH || './payload.config.ts'
  const configModule = await import(configPath)
  const config = configModule.default

  const { app, vite } = await createPayloadViteServer({
    config,
    dev: process.env.NODE_ENV !== 'production',
    port,
  })

  app.listen(port, () => {
    console.log(`\n  Payload CMS server running at http://localhost:${port}`)
    console.log(`  Admin panel: http://localhost:${port}/admin`)
    console.log(`  REST API:    http://localhost:${port}/api`)
    console.log(`  GraphQL:     http://localhost:${port}/api/graphql\n`)
  })

  // Graceful shutdown
  const shutdown = () => {
    if (vite) {
      void vite.close()
    }
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
