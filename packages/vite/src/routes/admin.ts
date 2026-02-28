import type { SanitizedConfig } from 'payload'
import type { ViteDevServer } from 'vite'

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export type AdminHtmlOptions = {
  adminEntryPath: string
  adminRoute: string
  config: SanitizedConfig
  dev: boolean
  vite?: ViteDevServer
}

const ADMIN_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payload Admin</title>
  <!--payload-head-->
</head>
<body>
  <div id="app"></div>
  <!--payload-scripts-->
</body>
</html>`

/**
 * Generate the admin panel HTML, with Vite dev scripts or production bundle references.
 */
export async function adminHtmlHandler(options: AdminHtmlOptions): Promise<string> {
  const { adminEntryPath, adminRoute, config, dev, vite } = options

  let html = ADMIN_HTML_TEMPLATE

  // Inject config data for client bootstrap
  const clientConfigScript = `<script>
    window.__PAYLOAD_ADMIN_ROUTE__ = ${JSON.stringify(adminRoute)};
    window.__PAYLOAD_API_ROUTE__ = ${JSON.stringify(config.routes.api || '/api')};
    window.__PAYLOAD_SERVER_URL__ = ${JSON.stringify(config.serverURL || '')};
  </script>`

  if (dev && vite) {
    // Development mode: inject Vite HMR client and entry module
    html = await vite.transformIndexHtml('/', html)
    html = html.replace(
      '<!--payload-head-->',
      clientConfigScript,
    )
    html = html.replace(
      '<!--payload-scripts-->',
      `<script type="module" src="${adminEntryPath}"></script>`,
    )
  } else {
    // Production: reference built assets
    try {
      const manifestPath = resolve(process.cwd(), 'dist/admin/.vite/manifest.json')
      const manifestContent = await readFile(manifestPath, 'utf-8')
      const manifest = JSON.parse(manifestContent)

      const entryChunk = Object.values(manifest).find(
        (chunk: any) => chunk.isEntry,
      ) as any

      const cssLinks = (entryChunk?.css || [])
        .map((css: string) => `<link rel="stylesheet" href="${adminRoute}/${css}" />`)
        .join('\n    ')

      html = html.replace(
        '<!--payload-head-->',
        `${clientConfigScript}\n    ${cssLinks}`,
      )
      html = html.replace(
        '<!--payload-scripts-->',
        `<script type="module" src="${adminRoute}/${entryChunk?.file || 'entry.js'}"></script>`,
      )
    } catch {
      // Fallback if manifest not found
      html = html.replace('<!--payload-head-->', clientConfigScript)
      html = html.replace(
        '<!--payload-scripts-->',
        `<script type="module" src="${adminRoute}/entry.js"></script>`,
      )
    }
  }

  return html
}

/**
 * Express handler for serving admin panel files.
 */
export function adminHandler() {
  // This is a placeholder - the actual admin handler is created in server.ts
  // using the adminHtmlHandler function with proper config
}
