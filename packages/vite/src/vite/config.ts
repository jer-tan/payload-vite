import type { UserConfig } from 'vite'

import { resolve } from 'node:path'

export type PayloadViteConfigOptions = {
  /** Path to the admin panel entry file */
  adminEntry?: string
  /** Admin route prefix */
  adminRoute?: string
  /** Output directory for the production build */
  outDir?: string
  /** Root directory of the project */
  root?: string
}

/**
 * Create a Vite configuration for building the Payload admin panel.
 * This can be used standalone or merged with an existing Vite config.
 */
export function createPayloadViteConfig(options: PayloadViteConfigOptions = {}): UserConfig {
  const {
    adminEntry = './src/admin/entry.tsx',
    adminRoute = '/admin',
    outDir = './dist/admin',
    root = process.cwd(),
  } = options

  return {
    base: adminRoute,
    build: {
      manifest: true,
      outDir: resolve(root, outDir),
      rollupOptions: {
        input: resolve(root, adminEntry),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
    resolve: {
      alias: {
        '@payloadcms/ui': resolve(root, 'node_modules/@payloadcms/ui'),
      },
    },
    root,
  }
}
