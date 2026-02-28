/**
 * Development server for testing Payload with Express + Vite.
 * Replaces the Next.js-based test/dev.ts for the Vite runtime.
 */
import chalk from 'chalk'
import { createServer } from 'http'
import minimist from 'minimist'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import open from 'open'
import { loadEnv } from 'payload/node'

import { runInit } from './runInit.js'
import { child } from './safelyRunScript.js'
import { createTestHooks } from './testHooks.js'

// @todo remove in 4.0 - will behave like this by default in 4.0
process.env.PAYLOAD_DO_NOT_SANITIZE_LOCALIZED_PROPERTY = 'true'

const prod = process.argv.includes('--prod')
if (prod) {
  process.argv = process.argv.filter((arg) => arg !== '--prod')
  process.env.PAYLOAD_TEST_PROD = 'true'
}

loadEnv()

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const {
  _: [_testSuiteArg = '_community'],
  ...args
} = minimist(process.argv.slice(2))

let testSuiteArg: string | undefined
let testSuiteConfigOverride: string | undefined
if (_testSuiteArg.includes('#')) {
  ;[testSuiteArg, testSuiteConfigOverride] = _testSuiteArg.split('#')
} else {
  testSuiteArg = _testSuiteArg
}

if (!testSuiteArg || !fs.existsSync(path.resolve(dirname, testSuiteArg))) {
  console.log(chalk.red(`ERROR: The test folder "${testSuiteArg}" does not exist`))
  process.exit(0)
}

console.log(`Selected test suite: ${testSuiteArg} [Vite + Express]`)

const { beforeTest } = await createTestHooks(testSuiteArg, testSuiteConfigOverride)
await beforeTest()

await runInit(testSuiteArg, true, false, testSuiteConfigOverride)

const findOpenPort = (startPort: number): Promise<number> => {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(startPort, () => {
      console.log(`✓ Running on port ${startPort}`)
      server.close(() => resolve(startPort))
    })
    server.on('error', () => {
      console.log(`⚠ Port ${startPort} is in use, trying ${startPort + 1} instead.`)
      findOpenPort(startPort + 1)
        .then(resolve)
        .catch(reject)
    })
  })
}

const port = process.env.PORT ? Number(process.env.PORT) : 3000
const availablePort = await findOpenPort(port)

// @ts-expect-error - PORT is a string from somewhere
process.env.PORT = availablePort

// Dynamic import of the Express + Vite server
const { createPayloadViteServer } = await import('@payloadcms/vite')

// Load the test suite config
const configPath = path.resolve(dirname, testSuiteArg, testSuiteConfigOverride || 'config.ts')
const configModule = await import(configPath)
const config = configModule.default

const adminRoute = '/admin'

const { app, vite } = await createPayloadViteServer({
  config,
  dev: true,
  port: availablePort,
})

app.listen(availablePort, () => {
  console.log(
    chalk.green(
      `\n  ✓ Payload dev server running at http://localhost:${availablePort}${adminRoute}\n`,
    ),
  )
})

// Open the admin if the -o flag is passed
if (args.o) {
  await open(`http://localhost:${availablePort}${adminRoute}`)
}

// Prefetch
void fetch(`http://localhost:${availablePort}/api/access`)

// Graceful shutdown
process.on('SIGINT', () => {
  if (child) {
    child.kill('SIGINT')
  }
  if (vite) {
    void vite.close()
  }
  process.exit(0)
})
process.on('SIGTERM', () => {
  if (child) {
    child.kill('SIGINT')
  }
  if (vite) {
    void vite.close()
  }
  process.exit(0)
})
