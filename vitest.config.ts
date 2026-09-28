import { defineConfig } from 'vitest/config'

/**
 * Kept separate from vite.config.ts. Tests should run on plain Node without the
 * Cloudflare plugin (they target pure functions only).
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // Only side-effect-free src/lib is subject to the 100% gate.
      include: ['src/lib/**/*.ts'],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
