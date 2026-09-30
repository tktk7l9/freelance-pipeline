import { defineConfig } from 'vitest/config'

/**
 * UI-layer tests (src/components, src/routes) on jsdom with Testing Library.
 *
 * Kept apart from vitest.config.ts: that one runs the pure src/lib tests on plain Node with a
 * 100% gate. Server functions are replaced with vi.fn() mocks in test/ui/setup.tsx, so nothing
 * here touches D1 or the network.
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/ui/**/*.test.tsx'],
    setupFiles: ['./test/ui/setup.tsx'],
    css: false,
    // Typing through user-event into Mantine inputs is slow under coverage on a loaded machine
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      include: ['src/components/**/*.{ts,tsx}', 'src/routes/**/*.tsx'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: 'coverage-ui',
      // Set 2 points under what the suite reached (lines 100, statements 99.4, functions 100,
      // branches 95.9) so a new screen without tests fails CI, while small refactors still pass
      thresholds: {
        lines: 98,
        statements: 97,
        functions: 98,
        branches: 93,
      },
    },
  },
})
