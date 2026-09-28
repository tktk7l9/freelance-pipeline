#!/usr/bin/env node
/**
 * Checks whether real data has slipped into what gets committed.
 *
 *   node scripts/check-pii.mjs            # tracked files in the working tree
 *   node scripts/check-pii.mjs --staged   # only what is about to be committed
 *
 * Writing "do not commit PII" as rule #1 in AGENTS.md does not enforce it on its own.
 * Instead of relying on people being careful, a machine checks.
 *
 * The words to look for are taken from **`.dev.vars`** and **`*.local.json` (the real-data ledgers)**.
 * My email and company names only live there, so there is no need to build and commit
 * a separate list of forbidden words (avoiding the loop where the list itself becomes PII).
 *
 * In an environment with neither (e.g. right after a CI clone) there is simply nothing
 * to match against, so succeed silently. To really enforce this in CI, run it locally
 * where the real data lives, or put it in pre-commit.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const devVarsPath = resolve(root, '.dev.vars')

/**
 * Words to match are taken from .dev.vars. My email only lives there, so there is
 * no need to build and commit a separate list of forbidden words.
 *   ACCESS_ALLOWED_EMAILS=a@x   → a@x
 *
 * Even without .dev.vars (e.g. right after a CI clone), continue with an empty list
 * so the *.local.json real-data ledgers can still be checked.
 */
function unquote(v) {
  return v.length >= 2 && v[0] === v[v.length - 1] && (v[0] === '"' || v[0] === "'")
    ? v.slice(1, -1)
    : v
}
const vars = existsSync(devVarsPath)
  ? Object.fromEntries(
      readFileSync(devVarsPath, 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => {
          const i = l.indexOf('=')
          return [l.slice(0, i).trim(), unquote(l.slice(i + 1).trim())]
        }),
    )
  : {}
const MIN_LENGTH = 2
const secrets = new Set()
for (const email of (vars.ACCESS_ALLOWED_EMAILS ?? '').split(',')) {
  const v = email.trim().toLowerCase()
  if (v.length >= MIN_LENGTH && !v.endsWith('@example.com')) secrets.add(v)
}
if (vars.DEV_IDENTITY_EMAIL && !vars.DEV_IDENTITY_EMAIL.endsWith('@example.com')) {
  secrets.add(vars.DEV_IDENTITY_EMAIL.trim().toLowerCase())
}

/**
 * Allowlist of fictitious values. If the real data (cases.local.json / history.local.json)
 * happens to contain the same string as a fictitious value used in docs, samples, or tests,
 * do not flag it. On top of the hand-written list, strings appearing in the committed
 * history.local.example.json (a sample, not gitignored) are collected recursively.
 */
const FICTIONAL_LITERALS = [
  '甲社',
  '乙社',
  'テスト案件',
  'テスト案件（サンプル）',
  'サンプル過去案件',
  '過去案件A',
  '担当した内容を箇条書きで',
]
function collectStrings(node, out) {
  if (typeof node === 'string') {
    out.add(node)
    return
  }
  if (Array.isArray(node)) {
    for (const v of node) collectStrings(v, out)
    return
  }
  if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectStrings(v, out)
  }
}
const fictional = new Set(FICTIONAL_LITERALS)
const examplePath = resolve(root, 'history.local.example.json')
if (existsSync(examplePath)) {
  try {
    collectStrings(JSON.parse(readFileSync(examplePath, 'utf8')), fictional)
  } catch {
    // If unreadable, continue with just the hand-written list
  }
}

/**
 * Also collect words from the real-data ledgers (gitignored).
 *   cases.local.json   … { company, title, agentName }[] written by add-case
 *   history.local.json … past cases { cases: [{ company, title, agentName, rawText, ... }] }
 * Company names are also matched by their core with "株式会社" etc. removed (to catch abbreviations).
 * An ASCII-only core that is short (e.g. 3 chars) easily misfires on unrelated code (e.g. `INF`
 * in `POSITIVE_INFINITY`), so ASCII-only cores need 4+ chars and a word-boundary match. Non-ASCII
 * cores also need 4+ chars, with a substring match (Japanese has no word boundaries, and a
 * 3-char katakana word always shows up as a fragment of longer common words. Real case: a
 * 3-char core matched "インボイス" and blocked the tests, 2026-09-25).
 * Companies whose core is 3 chars or fewer are matched only by the formal name with "株式会社" (3+ chars).
 */
const CORP_WORDS =
  /(株式会社|有限会社|合同会社|合資会社|一般社団法人|\(株\)|\(有\)|（株）|（有）|Inc\.?|Corp\.?|Co\.,? ?Ltd\.?|LLC)/g
const ASCII_ONLY = /^[\x20-\x7E]*$/
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
/** Match only ASCII cores with word boundaries (`\b<core>\b`) */
const boundarySecrets = new Set()
function addName(value) {
  if (typeof value !== 'string') return
  const v = value.trim()
  if (fictional.has(v)) return
  if (v.length >= 3) secrets.add(v)
  const core = v.replace(CORP_WORDS, '').trim()
  if (core === v || fictional.has(core)) return
  if (ASCII_ONLY.test(core)) {
    if (core.length >= 4) boundarySecrets.add(core)
  } else if (core.length >= 4) {
    secrets.add(core)
  }
}
/** rawText holds the whole raw text unsummarized, so match only line by line (20+ chars), never the whole block */
function addRawTextLines(value) {
  if (typeof value !== 'string') return
  for (const rawLine of value.split('\n')) {
    const line = rawLine.trim()
    if (line.length >= 20 && !fictional.has(line)) secrets.add(line)
  }
}
for (const name of ['cases.local.json', 'history.local.json']) {
  const p = resolve(root, name)
  if (!existsSync(p)) continue
  let json
  try {
    json = JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    continue
  }
  const rows = Array.isArray(json) ? json : Array.isArray(json?.cases) ? json.cases : []
  for (const r of rows) {
    addName(r?.company)
    addName(r?.title)
    addName(r?.agentName)
    addRawTextLines(r?.rawText)
  }
}

const secretList = [...secrets]

const staged = process.argv.includes('--staged')

/** Exclude generated files and those expected to contain real data in the first place */
const SKIP = /^(worker-configuration\.d\.ts|src\/routeTree\.gen\.ts)$/

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/**
 * List of files to check.
 *
 * With --staged, read **the index contents**. Reading the working tree would block
 * when dirty files are left unstaged, and conversely would let PII through if it was
 * staged and then deleted locally. What goes into the commit is the index, so check that.
 */
const files = (
  staged ? git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']) : git(['ls-files'])
)
  .split('\n')
  .filter(Boolean)
  .filter((file) => !SKIP.test(file))

const hits = []
for (const file of files) {
  let content
  try {
    content = staged ? git(['show', `:${file}`]) : readFileSync(resolve(root, file), 'utf8')
  } catch {
    continue // Skip binaries and unreadable files
  }
  for (const secret of secretList) {
    if (!content.includes(secret)) continue
    const line = content.split('\n').findIndex((text) => text.includes(secret)) + 1
    hits.push({ file, line, secret })
  }
  for (const core of boundarySecrets) {
    const re = new RegExp(`\\b${escapeRegExp(core)}\\b`)
    const lines = content.split('\n')
    const lineIndex = lines.findIndex((text) => re.test(text))
    if (lineIndex === -1) continue
    hits.push({ file, line: lineIndex + 1, secret: core })
  }
}

if (hits.length === 0) {
  const scope = staged ? 'コミット対象' : '追跡ファイル'
  const termCount = secretList.length + boundarySecrets.size
  console.log(`実データの混入なし（${termCount} 語を ${scope} ${files.length} 件と照合）。`)
  process.exit(0)
}

console.error('コミット対象に実データが混ざっています（AGENTS.md 1）:')
for (const hit of hits) {
  // Never print the matched word itself. If the output stays in logs, that is a leak too
  const masked = `${hit.secret.slice(0, 1)}…（${hit.secret.length}文字）`
  console.error(`  ${hit.file}:${hit.line}  ${masked}`)
}
console.error('\n架空の値に置き換えてください。実データは .dev.vars 経由でのみ入れます。')
process.exit(1)
