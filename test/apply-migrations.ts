import { applyD1Migrations, env, type D1Migration } from 'cloudflare:test'

/**
 * TEST_MIGRATIONS is a binding passed only by the test config (vitest.workers.config.ts).
 * It does not exist in the production Env, so it is received here without mixing it into the production types.
 */
const testEnv = env as unknown as { TEST_MIGRATIONS: D1Migration[] }

// Each test file's storage is isolated, so create the schema every time
await applyD1Migrations(env.DB, testEnv.TEST_MIGRATIONS)
