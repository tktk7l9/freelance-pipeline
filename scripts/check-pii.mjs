#!/usr/bin/env node
/**
 * 実データがコミット対象に紛れ込んでいないか調べる。
 *
 *   node scripts/check-pii.mjs            # 作業ツリーの追跡ファイル
 *   node scripts/check-pii.mjs --staged   # コミットしようとしている内容だけ
 *
 * AGENTS.md の1番目に「PII をコミットしない」と書いてあっても、書いてあるだけでは
 * 守られない。人が気をつける代わりに機械が見る。
 *
 * 探す語は **`.dev.vars`** と **`*.local.json`（実データの台帳）** から取り出す。
 * 自分のメールや企業名がそこにしか無いので、禁止語の一覧を別に作って
 * コミットする必要がない（一覧そのものが PII になってしまう、という堂々巡りを避ける）。
 *
 * どちらも無い環境（CI の clone 直後など）では、照合する材料が無いだけなので
 * 黙って成功させる。CI で本当に守りたいなら、実データを持っている手元で
 * 走らせるか、pre-commit に入れる。
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const devVarsPath = resolve(root, '.dev.vars')

/**
 * 照合する語は .dev.vars から取り出す。自分のメールがそこにしか無いので、
 * 禁止語の一覧を別に作ってコミットする必要がない。
 *   ACCESS_ALLOWED_EMAILS=a@x   → a@x
 *
 * .dev.vars が無い環境（CI の clone 直後など）でも、*.local.json の実データ
 * 台帳は見られるよう、無ければ空のまま続行する。
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
 * 実データの台帳（gitignore 済み）からも語を拾う。
 *   cases.local.json   … add-case が書く { company, title, agentName }[]
 *   history.local.json … 過去案件 { cases: [{ company, title, agentName, ... }] }
 * 企業名は「株式会社」等を外した中核（3 文字以上）でも照合する（略称に効かせる）。
 */
const CORP_WORDS =
  /(株式会社|有限会社|合同会社|合資会社|一般社団法人|\(株\)|\(有\)|（株）|（有）|Inc\.?|Corp\.?|Co\.,? ?Ltd\.?|LLC)/g
function addName(value) {
  if (typeof value !== 'string') return
  if (['甲社', '乙社', 'テスト案件'].includes(value)) return
  const v = value.trim()
  if (v.length >= 3) secrets.add(v)
  const core = v.replace(CORP_WORDS, '').trim()
  if (core.length >= 3 && core !== v) secrets.add(core)
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
  }
}

const secretList = [...secrets]

const staged = process.argv.includes('--staged')

/** 生成物と、そもそも実データが入る前提のものは除く */
const SKIP = /^(worker-configuration\.d\.ts|src\/routeTree\.gen\.ts)$/

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

/**
 * 見るファイルの一覧。
 *
 * --staged では **インデックスの内容** を読む。作業ツリーを読むと、
 * 汚れたファイルを stage せずに置いてあるときに止まってしまうし、
 * 逆に PII を stage したあと手元で消すと素通りしてしまう。
 * コミットに入るのはインデックスの中身なので、そちらを見る。
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
    continue // バイナリや読めないものは飛ばす
  }
  for (const secret of secretList) {
    if (!content.includes(secret)) continue
    const line = content.split('\n').findIndex((text) => text.includes(secret)) + 1
    hits.push({ file, line, secret })
  }
}

if (hits.length === 0) {
  const scope = staged ? 'コミット対象' : '追跡ファイル'
  console.log(`実データの混入なし（${secretList.length} 語を ${scope} ${files.length} 件と照合）。`)
  process.exit(0)
}

console.error('コミット対象に実データが混ざっています（AGENTS.md 1）:')
for (const hit of hits) {
  // 見つけた語そのものは出さない。出力がログに残ると、それも漏洩になる
  const masked = `${hit.secret.slice(0, 1)}…（${hit.secret.length}文字）`
  console.error(`  ${hit.file}:${hit.line}  ${masked}`)
}
console.error('\n架空の値に置き換えてください。実データは .dev.vars 経由でのみ入れます。')
process.exit(1)
