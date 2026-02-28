import { config as dotenvConfig } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { findUpSync } from '../utilities/findUp.js'

/**
 * Load environment variables from .env files.
 * Supports .env, .env.local, .env.development, .env.production, etc.
 * Replaces the previous @next/env dependency with dotenv.
 */
export function loadEnv(path?: string) {
  const dir = path?.length ? path : process.cwd()
  const dev = process.env.NODE_ENV !== 'production'
  const envMode = dev ? 'development' : 'production'

  // Load env files in priority order (later files don't override earlier ones)
  // This matches Next.js env file loading precedence
  const envFiles = [
    `.env.${envMode}.local`,
    '.env.local',
    `.env.${envMode}`,
    '.env',
  ]

  let loaded = false

  for (const envFile of envFiles) {
    const envPath = resolve(dir, envFile)
    if (existsSync(envPath)) {
      dotenvConfig({ path: envPath, override: false })
      loaded = true
    }
  }

  if (!loaded && !path?.length) {
    // use findUp to find the env file
    findUpSync({
      // @ts-expect-error - vestiges of when tsconfig was not strict. Feel free to improve
      condition: (searchDir) => {
        for (const envFile of envFiles) {
          const envPath = resolve(searchDir, envFile)
          if (existsSync(envPath)) {
            dotenvConfig({ path: envPath, override: false })
            return true
          }
        }
      },
      dir: process.cwd(),
    })
  }
}
