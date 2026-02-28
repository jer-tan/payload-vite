import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We test loadEnv by mocking its dependencies
vi.mock('dotenv', () => ({
  config: vi.fn(),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}))

vi.mock('../utilities/findUp.js', () => ({
  findUpSync: vi.fn(),
}))

describe('loadEnv', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalCwd = process.cwd

  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    process.cwd = originalCwd
  })

  it('should call dotenv.config for existing .env files in development mode', async () => {
    const { config: dotenvConfig } = await import('dotenv')
    const { existsSync } = await import('node:fs')

    process.env.NODE_ENV = 'development'
    vi.mocked(existsSync).mockImplementation((filePath: string) => {
      return typeof filePath === 'string' && filePath.endsWith('.env')
    })

    const { loadEnv } = await import('./loadEnv.js')
    loadEnv('/some/dir')

    expect(dotenvConfig).toHaveBeenCalledWith(expect.objectContaining({ override: false }))
  })

  it('should call dotenv.config for existing .env.local files in development mode', async () => {
    const { config: dotenvConfig } = await import('dotenv')
    const { existsSync } = await import('node:fs')

    process.env.NODE_ENV = 'development'
    vi.mocked(existsSync).mockImplementation((filePath: string) => {
      return typeof filePath === 'string' && filePath.endsWith('.env.local')
    })

    const { loadEnv } = await import('./loadEnv.js')
    loadEnv('/some/dir')

    expect(dotenvConfig).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining('.env.local'), override: false }),
    )
  })

  it('should use production env files when NODE_ENV is production', async () => {
    const { config: dotenvConfig } = await import('dotenv')
    const { existsSync } = await import('node:fs')

    process.env.NODE_ENV = 'production'
    vi.mocked(existsSync).mockImplementation((filePath: string) => {
      return typeof filePath === 'string' && filePath.endsWith('.env.production')
    })

    const { loadEnv } = await import('./loadEnv.js')
    loadEnv('/some/dir')

    expect(dotenvConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        path: expect.stringContaining('.env.production'),
        override: false,
      }),
    )
  })

  it('should not override already-set environment variables', async () => {
    const { config: dotenvConfig } = await import('dotenv')
    const { existsSync } = await import('node:fs')

    process.env.NODE_ENV = 'development'
    vi.mocked(existsSync).mockReturnValue(true)

    const { loadEnv } = await import('./loadEnv.js')
    loadEnv('/some/dir')

    expect(dotenvConfig).toHaveBeenCalledWith(expect.objectContaining({ override: false }))
  })

  it('should use findUpSync when no env file is found in given dir', async () => {
    const { findUpSync } = await import('../utilities/findUp.js')
    const { existsSync } = await import('node:fs')

    process.env.NODE_ENV = 'development'
    vi.mocked(existsSync).mockReturnValue(false)

    const { loadEnv } = await import('./loadEnv.js')
    loadEnv()

    expect(findUpSync).toHaveBeenCalledWith(
      expect.objectContaining({ condition: expect.any(Function), dir: expect.any(String) }),
    )
  })
})
