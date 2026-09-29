import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: { alias: { '@': __dirname } },
  test: { include: ['payload/**/*.test.ts', 'lib/**/*.test.ts'], environment: 'node' },
})
