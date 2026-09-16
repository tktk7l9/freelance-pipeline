#!/usr/bin/env node
/**
 * 過去案件（history.local.json・gitignore）を D1 へ冪等に取り込む。
 *   npm run import:history -- --remote|--local [--dry-run]
 *
 * slug から決定的な id を作り INSERT OR REPLACE で入れるので、何度流しても行は増えない。
 * 企業名・原文は標準出力に出さない（件数と文数だけ）。
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildHistoryStatements, historyFileSchema } from './lib/history.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv.includes('--remote')
  ? 'remote'
  : process.argv.includes('--local')
    ? 'local'
    : null
const dryRun = process.argv.includes('--dry-run')
if (!target) {
  console.error('使い方: npm run import:history -- --remote|--local [--dry-run]')
  process.exit(2)
}

const parsed = historyFileSchema.safeParse(
  JSON.parse(readFileSync(resolve(root, 'history.local.json'), 'utf8')),
)
if (!parsed.success) {
  console.error('history.local.json の検証エラー:')
  for (const i of parsed.error.issues) console.error(`  ${i.path.join('.')}: ${i.message}`)
  process.exit(1)
}
const statements = buildHistoryStatements(parsed.data, new Date().toISOString())
console.log(`${parsed.data.cases.length} 件・${statements.length} 文`)
if (dryRun) process.exit(0)

const dir = mkdtempSync(join(tmpdir(), 'import-history-'))
try {
  const sqlPath = join(dir, 'history.sql')
  writeFileSync(sqlPath, statements.join('\n'))
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'freelance-pipeline', `--${target}`, '--file', sqlPath],
    { cwd: root, stdio: 'inherit' },
  )
} finally {
  rmSync(dir, { recursive: true, force: true })
}
console.log('取り込みました')
