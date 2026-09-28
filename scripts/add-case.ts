#!/usr/bin/env node
/**
 * Validates a case-sheet JSON written by Claude Code and inserts it into D1.
 *
 *   npm run add-case -- --file=<json> --remote|--local [--dry-run] [--update=<id>]
 *
 * 1. Validate with the zod schema in src/lib/caseInput.ts (the same one the /import form uses)
 * 2. If taxBasis is excl, normalize to tax-included (toCaseRow)
 * 3. Duplicate lookup (sourceUrl, or company+title). Abort if found. --update=<id> overwrites
 * 4. Write the INSERT (cases + case_log) to a temp SQL file and run wrangler d1 execute --file
 * 5. Delete the temp file. Record company/case names in cases.local.json (gitignored; a check-pii source)
 *
 * Adds no secrets (only wrangler's OAuth). Never prints the raw text or company names to stdout.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseCaseJson, toCaseRow } from '../src/lib/caseInput.ts'
import {
  duplicateQuery,
  insertCaseStatements,
  sqlLiteral,
  updateCaseStatement,
  upsertCompanyStatement,
  updateLogStatement,
} from './lib/caseSql.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATABASE = 'freelance-pipeline'
const LOCAL_LEDGER = resolve(root, 'cases.local.json')

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}
const file = arg('file')
const target = process.argv.includes('--remote')
  ? 'remote'
  : process.argv.includes('--local')
    ? 'local'
    : null
const dryRun = process.argv.includes('--dry-run')
const updateId = arg('update')

if (!file || !target) {
  console.error(
    '使い方: npm run add-case -- --file=<json> --remote|--local [--dry-run] [--update=<id>]',
  )
  process.exit(2)
}

function wrangler(args: string[]): string {
  return execFileSync('npx', ['wrangler', 'd1', 'execute', DATABASE, `--${target}`, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
}

function query(sql: string): Array<Record<string, unknown>> {
  const out = wrangler(['--json', '--command', sql])
  const start = out.indexOf('[')
  const parsed = JSON.parse(out.slice(start)) as Array<{ results: Array<Record<string, unknown>> }>
  return parsed[0]?.results ?? []
}

const parsed = parseCaseJson(readFileSync(file, 'utf8'))
if (!parsed.ok) {
  console.error('検証エラー:')
  for (const i of parsed.issues) console.error(`  ${i.path || '(root)'}: ${i.message}`)
  process.exit(1)
}
const row = toCaseRow(parsed.input)
const at = new Date().toISOString()

if (!updateId) {
  const dup = query(
    duplicateQuery({ sourceUrl: row.sourceUrl, company: row.company, title: row.title }),
  )
  if (dup.length > 0) {
    console.error(
      `同じ案件が既にあります（${dup.length} 件）。上書きするなら --update=<id> を付けてください:`,
    )
    for (const d of dup) console.error(`  id=${d.id} status=${d.status}`)
    process.exit(1)
  }
} else {
  const existing = query(`SELECT id FROM cases WHERE id = ${sqlLiteral(updateId)} LIMIT 1;`)
  if (existing.length === 0) {
    console.error('id が見つかりません')
    process.exit(1)
  }
}

const id = updateId ?? crypto.randomUUID()
const statements = updateId
  ? [
      updateCaseStatement(updateId, row),
      updateLogStatement({
        id: crypto.randomUUID(),
        caseId: updateId,
        at,
        body: 'add-case --update',
      }),
    ]
  : insertCaseStatements({ id, row, at, importNote: 'add-case', logId: crypto.randomUUID() })
// The company's official site goes into the companies table, not a case column (overwrite if the name matches)
if (parsed.input.companyUrl) {
  statements.push(upsertCompanyStatement(row.company, parsed.input.companyUrl))
}

if (dryRun) {
  console.log(
    `dry-run: ${statements.length} 文（${updateId ? 'UPDATE' : 'INSERT'}）。税込上限=${row.monthlyMaxIncl}`,
  )
  process.exit(0)
}

const dir = mkdtempSync(join(tmpdir(), 'add-case-'))
const sqlPath = join(dir, 'case.sql')
try {
  writeFileSync(sqlPath, statements.join('\n'))
  wrangler(['--file', sqlPath])
} finally {
  rmSync(dir, { recursive: true, force: true })
}

// Source list for check-pii. No raw text here (only company, case, and agent names)
const ledger: Array<{ company: string; title: string; agentName: string | null }> = existsSync(
  LOCAL_LEDGER,
)
  ? (JSON.parse(readFileSync(LOCAL_LEDGER, 'utf8')) as typeof ledger)
  : []
ledger.push({ company: row.company, title: row.title, agentName: row.agentName })
writeFileSync(LOCAL_LEDGER, JSON.stringify(ledger, null, 2))

console.log(`${updateId ? '更新' : '登録'}しました: id=${id}`)
console.log(`  /cases/${id}`)
