#!/usr/bin/env node
/**
 * Claude Code が書いた案件票 JSON を検証して D1 へ入れる。
 *
 *   npm run add-case -- --file=<json> --remote|--local [--dry-run] [--update=<id>]
 *
 * 1. src/lib/caseInput.ts の zod で検証（/import フォームと同じ 1 本）
 * 2. taxBasis が excl なら税込に正規化（toCaseRow）
 * 3. 重複照会（sourceUrl か company+title）。あれば中断。--update=<id> で上書き
 * 4. INSERT（cases + case_log）を一時 SQL に書いて wrangler d1 execute --file
 * 5. 一時ファイル削除。cases.local.json（gitignore・check-pii の照合元）に企業名/案件名を控える
 *
 * 秘密は増えない（wrangler の OAuth のみ）。原文・企業名は標準出力に出さない。
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

// check-pii の照合元。原文は入れない（企業名・案件名・エージェント名だけ）
const ledger: Array<{ company: string; title: string; agentName: string | null }> = existsSync(
  LOCAL_LEDGER,
)
  ? (JSON.parse(readFileSync(LOCAL_LEDGER, 'utf8')) as typeof ledger)
  : []
ledger.push({ company: row.company, title: row.title, agentName: row.agentName })
writeFileSync(LOCAL_LEDGER, JSON.stringify(ledger, null, 2))

console.log(`${updateId ? '更新' : '登録'}しました: id=${id}`)
console.log(`  /cases/${id}`)
