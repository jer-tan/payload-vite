import react from '@vitejs/plugin-react'
import path from 'node:path'
/**
 * Vite configuration for building the Payload admin panel.
 * This replaces next.config.mjs for the admin panel build.
 */
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/admin',
  build: {
    manifest: true,
    outDir: 'dist/admin',
    rollupOptions: {
      input: path.resolve(__dirname, 'packages/vite/src/admin/entry.tsx'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@payloadcms/ui': path.resolve(__dirname, 'packages/ui/src/exports/client/index.ts'),
      '@payloadcms/ui/providers/RouterAdapter': path.resolve(
        __dirname,
        'packages/ui/src/providers/RouterAdapter/index.tsx',
      ),
    },
  },
})
