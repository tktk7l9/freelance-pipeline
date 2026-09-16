# freelance-pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 選考中の案件（応募→書類→商談→内定→参画）を一覧・詳細・比較で追い、案件票の原文ごと自分の D1 に残す私的 Web アプリを、Claude Code からの投入スクリプトと過去案件の取込まで含めて本番（Cloudflare Workers）に出す。

**Architecture:** `sumai-log`（`../sumai-log`）を雛形に、認証・CSRF・セキュリティヘッダ・D1/Drizzle・vitest 二系統・モバイルシェル（下タブ＋FAB＋全画面 Drawer）を流用し、R2/地図/写真/YouTube/用語集/複数利用者を削ぎ落とす。純粋関数は `src/lib/`（100% カバレッジ・スクリプトからも `node --experimental-strip-types` で同じファイルを読む）、副作用は `src/server/`、DB は `src/db/`、UI は `src/components/` と `src/routes/`。判断基準の数値・軸名は D1 の `settings` にだけ置き、コードに書かない。

**Tech Stack:** TanStack Start + React 19 + Mantine v9 + Drizzle ORM (D1) + zod 4 + Cloudflare Workers / D1 / Access + vitest 4（node と workers pool）+ Node `--experimental-strip-types`（スクリプト）+ Prettier + Keyway

**Spec:** `docs/superpowers/specs/2026-09-16-freelance-pipeline-design.md`

## Global Constraints

- 雛形は `/Users/saitoutakuya/src/github.com/tktk7l9/sumai-log`（以下 `sumai-log/`）。「コピー」と書いたファイルは中身をそのまま持ってくる
- **実データをコード・テスト・seed・コメント・スクショに書かない**（企業名・案件名・単価・エージェント名・原文・メール）。テストは `甲社` `乙社` `owner@example.com` `テスト案件` など架空値。コミット前に `npm run check:pii`（照合元は gitignore 済みの `.dev.vars` と `*.local.json`）
- **判断基準（単価下限・時給下限・希望開始月・出社上限・比較の軸名）をコードに書かない。** D1 の `settings` に画面から入れる。README にも書かない
- リポジトリは **public**。本人のメールは Worker の secret と `.dev.vars` にしか置かない。`wrangler.jsonc` の `vars` にメールを書かない
- `src/lib/` は純粋関数のみ（`cloudflare:workers`・fetch・`Date.now()` を持ち込まない）。`test:coverage` の 100% ゲート対象
- **スクリプトが読む lib（`enums.ts` `status.ts` `rate.ts` `caseInput.ts`）は lib 内の相互 import に `.ts` 拡張子を付ける**（Node の strip-types は拡張子必須。tsconfig は `allowImportingTsExtensions: true`）。TS の enum / namespace / parameter properties は使わない（erasable syntax only）
- 日付は TEXT の ISO-8601（日付のみは `YYYY-MM-DD`、月のみ `YYYY-MM`）、金額は円の整数、id は `text` で `crypto.randomUUID()`。`createdAt`/`updatedAt` は **両方** `sql\`(datetime('now'))\``（更新側で `new Date().toISOString()` を書かない）
- **単価は税込を正本**。列名は `monthlyMaxIncl` / `monthlyMinIncl`。案件票が税抜なら `toIncl()` が `Math.round(v * 1.1)` する。LLM に ×1.1 させない
- Prettier: `semi: false` `singleQuote: true` `printWidth: 100` `trailingComma: 'all'`
- UI の文言は日本語。`robots: noindex, nofollow, noarchive`
- 完了基準は各タスク末尾のコマンドに加え、最終的に `npm run format:check` `typecheck` `test:coverage` `test:server` `test:scripts` `build` `check:pii` がすべて green
- Node はローカル 22.14 / CI 24。パッケージマネージャは npm（`package-lock.json` をコミット）
- コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- 実装は商談の前後を避ける（仕様 §H の注意）

## File Structure

| 場所 | 責務 |
|---|---|
| `src/lib/enums.ts` | 経路・税基準・リモート種別・ログ種別の定数とラベル（import なし） |
| `src/lib/status.ts` | ステータス一覧・ラベル・色・グループ・`canTransition` |
| `src/lib/rate.ts` | 税込化・税抜・基準時間・時給・万円表示・中央値 |
| `src/lib/caseInput.ts` | Claude Code 出力の zod 契約 `caseInputSchema`・`toCaseRow`・`parseCaseJson` |
| `src/lib/deadlines.ts` | 期日順・期限状態 |
| `src/lib/caseLog.ts` | ログ行の表示整形・並び |
| `src/lib/compare.ts` | 閾値/軸の parse・比較表の行列化・○△× |
| `src/db/schema.ts` | `cases` `case_log` `settings` |
| `src/server/repository/{cases,settings}.ts` | D1 操作（`db` 引数・実 D1 で worker-test） |
| `src/server/cases.schema.ts` | server function の zod（直テスト用に分離） |
| `src/server/{cases,home,settings}.ts` | `createServerFn` |
| `src/components/cases/*` | StatusBadge / CaseCard / CaseTable / CaseForm / StatusChanger / NextActionEditor / CaseLogList / RawTextPanel |
| `src/components/home/*` | DueList / PipelineStats / RecentLog |
| `src/components/compare/CompareTable.tsx` | 比較表 |
| `src/components/import/ImportForm.tsx` | JSON 貼付フォーム |
| `src/routes/{index,cases,cases_.$id,compare,import,settings}.tsx` | 画面 |
| `scripts/lib/caseSql.ts` | SQL 生成（純粋・`node --test`） |
| `scripts/add-case.ts` | Claude Code 投入 CLI |
| `scripts/import-history.ts` | 過去案件の冪等取込 |
| `scripts/check-pii.mjs` | 実データ混入検査（`.dev.vars` + `*.local.json`） |

---

### Task 1: リポジトリの土台（sumai-log の複製と削ぎ落とし）

**Files:**
- Copy from `sumai-log/`: `.prettierrc` `.prettierignore` `tsconfig.json` `tsr.config.json` `postcss.config.cjs` `vite.config.ts` `vitest.config.ts` `vitest.workers.config.ts` `drizzle.config.ts` `.github/workflows/ci.yml` `.github/dependabot.yml` `.githooks/pre-commit` `test/worker-stub.ts` `test/apply-migrations.ts` `test/env.d.ts` `src/router.tsx` `src/start.ts` `src/server/auth.ts` `src/db/client.ts` `src/lib/access.ts` `src/lib/access.test.ts` `src/lib/csrf.ts` `src/lib/csrf.test.ts` `src/lib/securityHeaders.ts` `src/lib/securityHeaders.test.ts` `src/lib/nav.ts` `src/lib/nav.test.ts` `src/lib/dates.ts` `src/lib/dates.test.ts` `src/lib/jst.ts` `src/lib/jst.test.ts` `src/lib/format.ts` `src/lib/format.test.ts` `src/lib/emptyToNull.ts` `src/lib/emptyToNull.test.ts` `src/lib/ids.ts` `src/lib/ids.test.ts` `src/lib/formError.ts` `src/lib/formError.test.ts` `src/components/ErrorStates.tsx` `src/components/ColorSchemeToggle.tsx` `src/components/PageShell.tsx` `src/components/Fab.tsx` `src/components/FormDrawer.tsx` `src/components/EmptyState.tsx` `src/components/candidates/DetailRow.tsx`（→ `src/components/DetailRow.tsx` に置く）`public/robots.txt` `public/favicon.svg` `public/icons/icon-192.png` `public/icons/icon-512.png`
- Create: `package.json` `wrangler.jsonc` `.gitignore` `.dev.vars.example` `README.md` `AGENTS.md` `src/routes/__root.tsx` `src/routes/index.tsx` `src/styles.css` `src/theme.ts` `src/db/schema.ts`（最小）`src/components/AppLayout.tsx` `public/manifest.json`
- Copy and edit: `scripts/check-pii.mjs`（Task 6 で `*.local.json` 対応。ここではコピーのみ）

**Interfaces:**
- Produces: `requireUser(request): Promise<Identity>`（`src/server/auth.ts`・そのまま）／`getDb(): Db`（`src/db/client.ts`）／`PageShell({ title, description?, actions?, fab?, children })`／`Fab({ label, onClick })`／`FormDrawer({ opened, onClose, title, children })`／`EmptyState({ emoji?, title, description?, action? })`／`Row({ label, value })`（`src/components/DetailRow.tsx`）／`formatJst(value, { withTime? })`／`formatYen(value)`／`extractErrorMessage(error)`／`UUID_SHAPE`

- [ ] **Step 1: 雛形ファイルのコピー**

```bash
cd /Users/saitoutakuya/src/github.com/tktk7l9/freelance-pipeline
S=/Users/saitoutakuya/src/github.com/tktk7l9/sumai-log
mkdir -p .github/workflows .githooks test src/lib src/server/repository src/db src/components src/routes public/icons scripts/lib drizzle
for f in .prettierrc .prettierignore tsconfig.json tsr.config.json postcss.config.cjs vite.config.ts vitest.config.ts vitest.workers.config.ts drizzle.config.ts .github/workflows/ci.yml .github/dependabot.yml .githooks/pre-commit test/worker-stub.ts test/apply-migrations.ts test/env.d.ts src/router.tsx src/start.ts src/server/auth.ts src/db/client.ts src/lib/access.ts src/lib/access.test.ts src/lib/csrf.ts src/lib/csrf.test.ts src/lib/securityHeaders.ts src/lib/securityHeaders.test.ts src/lib/nav.ts src/lib/nav.test.ts src/lib/dates.ts src/lib/dates.test.ts src/lib/jst.ts src/lib/jst.test.ts src/lib/format.ts src/lib/format.test.ts src/lib/emptyToNull.ts src/lib/emptyToNull.test.ts src/lib/ids.ts src/lib/ids.test.ts src/lib/formError.ts src/lib/formError.test.ts src/components/ErrorStates.tsx src/components/ColorSchemeToggle.tsx src/components/PageShell.tsx src/components/Fab.tsx src/components/FormDrawer.tsx src/components/EmptyState.tsx public/robots.txt public/favicon.svg public/icons/icon-192.png public/icons/icon-512.png scripts/check-pii.mjs; do cp "$S/$f" "$f"; done
cp "$S/src/components/candidates/DetailRow.tsx" src/components/DetailRow.tsx
chmod +x .githooks/pre-commit
```

`src/lib/securityHeaders.ts` の CSP を書き換える（地図・YouTube を持たないので外部 img を消す。`geolocation` も閉じる）:

```ts
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'cross-origin-opener-policy': 'same-origin',
  'content-security-policy':
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; img-src 'self' data:; connect-src 'self'",
```

`src/lib/securityHeaders.test.ts` の期待値も同じ文字列に直す。`src/lib/format.ts` は `formatYen` だけ残し `formatSqm` `formatTsubo` と対応するテストを消す。`src/lib/formError.ts` の `FIELD_CODE_MESSAGE` は候補アプリ固有の項目（`serviceAreas` `uaValue` `tags` 等）を消し、以下だけにする（キーは Task 3 の `caseInputSchema` の項目名）:

```ts
const FIELD_CODE_MESSAGE: Record<string, Partial<Record<ZodIssueCode, string>>> = {
  company: { too_small: '企業名は必須です', too_big: '企業名は 200 文字までです' },
  title: { too_small: '案件名は必須です', too_big: '案件名は 300 文字までです' },
  monthlyMax: { too_small: '単価上限は 1 円以上', invalid_type: '単価上限は整数で入れてください' },
  startDate: { invalid_format: '開始は YYYY-MM-DD か YYYY-MM' },
  nextActionDue: { invalid_format: '期日は YYYY-MM-DD' },
  sourceUrl: { too_big: 'URL は 500 文字までです' },
  rawText: { too_small: '原文は必須です', too_big: '原文は 50,000 文字までです' },
  json: { too_big: 'JSON が長すぎます' },
  body: { too_small: 'メモを入れてください', too_big: 'メモは 4000 文字までです' },
}
```

`formError.test.ts` はキーに合わせて書き換える（`company` の `too_small` → `企業名は必須です`、未知のキーは既定文言、日本語メッセージはそのまま、の 3 ケースを残す）。

- [ ] **Step 2: `package.json`**（バージョンは `sumai-log/package.json` と同じ値。`leaflet` `@types/leaflet` を外し、scripts を差し替える）

```json
{
  "name": "freelance-pipeline",
  "private": true,
  "type": "module",
  "imports": { "#/*": "./src/*" },
  "scripts": {
    "prepare": "git config core.hooksPath .githooks || true",
    "dev": "vite dev --port 3000",
    "generate-routes": "tsr generate",
    "build": "vite build",
    "preview": "npm run build && vite preview",
    "test": "vitest run && vitest run --config vitest.workers.config.ts && npm run test:scripts",
    "test:coverage": "vitest run --coverage",
    "test:server": "vitest run --config vitest.workers.config.ts",
    "test:scripts": "node --experimental-strip-types --test scripts/lib/*.test.ts",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check:pii": "node scripts/check-pii.mjs",
    "deploy": "npm run build && wrangler deploy",
    "cf-typegen": "wrangler types",
    "db:generate": "drizzle-kit generate",
    "db:migrate:local": "wrangler d1 migrations apply freelance-pipeline --local",
    "db:migrate:remote": "wrangler d1 migrations apply freelance-pipeline --remote",
    "db:export": "wrangler d1 export freelance-pipeline --remote --output backups/freelance-pipeline-$(date +%Y%m%d).sql",
    "add-case": "node --experimental-strip-types scripts/add-case.ts",
    "import:history": "node --experimental-strip-types scripts/import-history.ts"
  },
  "dependencies": {
    "@cloudflare/vite-plugin": "^1.54.5",
    "@mantine/core": "^9.6.0",
    "@mantine/dates": "^9.6.0",
    "@mantine/form": "^9.6.0",
    "@mantine/hooks": "^9.6.0",
    "@mantine/notifications": "^9.6.0",
    "@tanstack/react-router": "latest",
    "@tanstack/react-router-ssr-query": "latest",
    "@tanstack/react-start": "latest",
    "@tanstack/router-plugin": "^1.168.36",
    "dayjs": "^1.11.21",
    "drizzle-orm": "^0.45.2",
    "jose": "^6.2.12",
    "lucide-react": "^1.43.0",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.22.0",
    "@tanstack/devtools-vite": "latest",
    "@tanstack/router-cli": "^1.167.34",
    "@types/node": "^26.5.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.0.1",
    "@vitest/coverage-v8": "^4.1.10",
    "drizzle-kit": "^0.31.10",
    "postcss": "^8.5.28",
    "postcss-preset-mantine": "^1.18.0",
    "postcss-simple-vars": "^7.0.1",
    "prettier": "^3.9.6",
    "typescript": "^7.0.2",
    "vite": "^8.0.0",
    "vitest": "^4.1.5",
    "wrangler": "^4.131.0"
  },
  "overrides": {
    "@esbuild-kit/core-utils": { "esbuild": "^0.25.0" },
    "sharp": "^0.35.4"
  }
}
```

`.github/workflows/ci.yml` の `npm run test:scripts` はそのまま（scripts が `.ts` になるだけ）。`tsconfig.json` の `allowJs` はそのまま残す（`check-pii.mjs` は型検査対象外）。

- [ ] **Step 3: `wrangler.jsonc`**（`database_id` と Access の値は Task 13 で本物に置き換える）

```jsonc
/**
 * freelance-pipeline — Cloudflare Workers 設定
 * https://developers.cloudflare.com/workers/wrangler/configuration/
 */
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "freelance-pipeline",
  // @cloudflare/vitest-pool-workers@0.22 が対応する上限（sumai-log で実測）
  "compatibility_date": "2026-08-22",
  "compatibility_flags": ["nodejs_compat"],
  "main": "@tanstack/react-start/server-entry",
  "observability": { "enabled": true },
  "upload_source_maps": true,

  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "freelance-pipeline",
      // Task 13 で `wrangler d1 create freelance-pipeline` の値に置き換える
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "drizzle/migrations",
    },
  ],

  /**
   * 既定を production にして、設定漏れは必ず「拒否」側に倒す。
   * ACCESS_TEAM_DOMAIN / ACCESS_POLICY_AUD は非秘密（Task 13 で置き換える）。
   * ACCESS_ALLOWED_EMAILS は secret（`wrangler secret put`）。ここに書かない。
   */
  "vars": {
    "ENVIRONMENT": "production",
    "ACCESS_TEAM_DOMAIN": "",
    "ACCESS_POLICY_AUD": "",
  },
}
```

- [ ] **Step 4: `.gitignore` と `.dev.vars.example`**

```gitignore
node_modules
.DS_Store
dist
dist-ssr
*.local
.tanstack
.wrangler
.output
__unconfig*
coverage
/backups/

# 秘密・個人情報（Keyway が書き出す .env.* も含めて塞ぐ）
.dev.vars*
!.dev.vars.example
.env
.env.*
!.env*.example

# 実データ（案件票・過去案件）はコミットしない。check-pii の照合元でもある
*.local.json

# サブエージェント駆動の作業ファイル
.superpowers/

# git worktree（superpowers:using-git-worktrees）
.worktrees/
.claude/

# Playwright MCP のスクリーンショット出力
.playwright-mcp/
```

```dotenv
# ローカル開発用。`.dev.vars` にコピーして使う（gitignore 済み）。
# Keyway を使う場合: keyway pull -e development -f .dev.vars -y
#
# ローカルには Cloudflare Access が無いため、ENVIRONMENT=development のときだけ
# DEV_IDENTITY_EMAIL を認証済み利用者として扱う。本番では必ず無効。

ENVIRONMENT=development
DEV_IDENTITY_EMAIL=owner@example.com
ACCESS_ALLOWED_EMAILS=owner@example.com

# 本番でのみ使う値（ローカルでは空でよい）
ACCESS_TEAM_DOMAIN=
ACCESS_POLICY_AUD=
```

- [ ] **Step 5: `src/db/schema.ts`（最小・Task 2 で全表にする）と `src/lib/enums.ts`**

`src/lib/enums.ts`（import を持たない。スクリプトからも読む）:

```ts
/** 経路・税基準・リモート種別・ログ種別。schema.ts と lib の両方がここを参照する（import なし） */
export const ROUTES = ['levtech', 'findy', 'direct', 'other'] as const
export type Route = (typeof ROUTES)[number]
export const ROUTE_LABEL: Record<Route, string> = {
  levtech: 'レバテック',
  findy: 'Findy',
  direct: '直接',
  other: 'その他',
}

export const TAX_BASES = ['incl', 'excl'] as const
export type TaxBasis = (typeof TAX_BASES)[number]
export const TAX_BASIS_LABEL: Record<TaxBasis, string> = { incl: '税込表示', excl: '税抜表示' }

export const REMOTE_TYPES = ['full', 'partial', 'onsite'] as const
export type RemoteType = (typeof REMOTE_TYPES)[number]
export const REMOTE_LABEL: Record<RemoteType, string> = {
  full: 'フルリモート',
  partial: '一部出社',
  onsite: '常駐',
}

export const LOG_KINDS = ['status', 'memo', 'import'] as const
export type LogKind = (typeof LOG_KINDS)[number]
```

`src/db/schema.ts`（最小）:

```ts
import { sql } from 'drizzle-orm'
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** 方針: 日付は TEXT の ISO-8601、金額は円の整数、id は text（crypto.randomUUID()）。 */
export const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamps.updatedAt,
})
```

- [ ] **Step 6: `src/theme.ts` `src/styles.css` `src/routes/__root.tsx` `src/routes/index.tsx` `src/components/AppLayout.tsx` `src/lib/nav.ts` `public/manifest.json`**

`src/lib/nav.ts`（`isNavItemActive` はコピーのまま。`NAV_ITEMS` を差し替え、`nav.test.ts` の期待も 4 件に直す）:

```ts
export const NAV_ITEMS = [
  { to: '/', label: 'ホーム', icon: 'home' },
  { to: '/cases', label: '案件', icon: 'briefcase' },
  { to: '/compare', label: '比較', icon: 'columns' },
  { to: '/settings', label: '設定', icon: 'settings' },
] as const
export type NavIcon = (typeof NAV_ITEMS)[number]['icon']
```

`src/theme.ts`（中立寒色。sumai-log の暖色トークンは持ち込まない）:

```ts
import { createTheme } from '@mantine/core'

/**
 * 案件の台帳。読む時間が長いので、地は白に近い寒色、アクセントは藍 1 色。
 * 住まいログ（暖色）と並べても取り違えない配色にする。
 */
export const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", Meiryo, "Segoe UI", sans-serif',
  fontSizes: { xs: '0.75rem', sm: '0.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem' },
  lineHeights: { xs: '1.5', sm: '1.6', md: '1.7', lg: '1.6', xl: '1.5' },
  headings: {
    fontWeight: '700',
    sizes: {
      h1: { fontSize: '1.5rem', lineHeight: '1.35' },
      h2: { fontSize: '1.1875rem', lineHeight: '1.45' },
      h3: { fontSize: '1.0625rem', lineHeight: '1.5' },
    },
  },
  components: {
    TextInput: { defaultProps: { size: 'md' } },
    NumberInput: { defaultProps: { size: 'md' } },
    Textarea: { defaultProps: { size: 'md' } },
    Select: { defaultProps: { size: 'md' } },
    TagsInput: { defaultProps: { size: 'md' } },
    Button: { defaultProps: { size: 'md' } },
    Badge: { defaultProps: { radius: 'sm' } },
    Table: { defaultProps: { verticalSpacing: 'xs', horizontalSpacing: 'sm' } },
  },
})
```

`src/styles.css`:

```css
:root {
  color-scheme: light dark;
}

:root[data-mantine-color-scheme='light'],
:host([data-mantine-color-scheme='light']) {
  --mantine-color-body: #f6f7f9;
  --fp-lift: 0 6px 18px -6px rgba(30, 41, 59, 0.35);
}
:root[data-mantine-color-scheme='dark'],
:host([data-mantine-color-scheme='dark']) {
  --fp-lift: 0 6px 18px -6px rgba(0, 0, 0, 0.7);
}

a {
  color: inherit;
}
a:focus-visible {
  outline: 2px solid var(--mantine-primary-color-filled);
  outline-offset: 2px;
  border-radius: inherit;
}

/* 長い URL・原文が枠を突き破らないように */
.breakable {
  overflow-wrap: anywhere;
}

/* ヘッダ・下タブは面の色に */
.appbar,
.tabbar {
  background: var(--mantine-color-default);
}
/* 下タブはホームインジケータの分だけ下に余白を足す */
.tabbar {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.app-main {
  padding-bottom: calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom, 0px));
}
/* FAB のあるページは最後のカードが隠れないよう下に余白 */
.fab-clearance {
  padding-bottom: 96px;
}
.lifted {
  box-shadow: var(--fp-lift);
}
/* 原文はモノスペースで折り返す */
.rawtext {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: var(--mantine-font-size-sm);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
/* 比較表: 先頭列を固定 */
.compare-table th:first-child,
.compare-table td:first-child {
  position: sticky;
  left: 0;
  background: var(--mantine-color-default);
  z-index: 1;
}
.cell-bad {
  background: var(--mantine-color-red-light);
  color: var(--mantine-color-red-light-color);
}
```

`src/components/AppLayout.tsx`（sumai-log から: 用語集/設定のヘッダリンクを消し、設定はタブに入る。アイコン差し替え）:

```tsx
import { AppShell, Group, NavLink, Stack, Text, UnstyledButton } from '@mantine/core'
import { Link, useLocation } from '@tanstack/react-router'
import { Briefcase, Columns3, House, Settings } from 'lucide-react'

import { NAV_ITEMS, isNavItemActive, type NavIcon } from '../lib/nav'
import { ColorSchemeToggle } from './ColorSchemeToggle'

const ICONS: Record<NavIcon, typeof House> = {
  home: House,
  briefcase: Briefcase,
  columns: Columns3,
  settings: Settings,
}

/** スマホ: 上に小さなヘッダ、下にタブバー。デスクトップ(sm 以上): 左ナビ。 */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <AppShell
      header={{ height: 52 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: true } }}
      footer={{ height: { base: 56, sm: 0 } }}
      padding="md"
    >
      <AppShell.Header className="appbar">
        <Group h="100%" px="md" justify="space-between" wrap="nowrap" gap="xs">
          <Text fw={700} size="lg" component={Link} to="/" c="inherit" td="none">
            案件パイプライン
          </Text>
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar className="appbar" p="xs">
        {NAV_ITEMS.map(({ to, label, icon }) => {
          const Icon = ICONS[icon]
          const active = isNavItemActive(pathname, to)
          return (
            <NavLink
              key={to}
              component={Link}
              to={to}
              label={label}
              leftSection={<Icon size={18} aria-hidden />}
              active={active}
              aria-current={active ? 'page' : undefined}
            />
          )
        })}
      </AppShell.Navbar>

      <AppShell.Main className="app-main">{children}</AppShell.Main>

      <AppShell.Footer hiddenFrom="sm" className="tabbar" withBorder>
        <Group grow gap={0} h="100%" component="nav" aria-label="主要なページ">
          {NAV_ITEMS.map(({ to, label, icon }) => {
            const Icon = ICONS[icon]
            const active = isNavItemActive(pathname, to)
            return (
              <UnstyledButton
                key={to}
                component={Link}
                to={to}
                aria-current={active ? 'page' : undefined}
                h="100%"
                c={active ? 'indigo' : 'dimmed'}
              >
                <Stack align="center" justify="center" gap={3} h="100%">
                  <Icon size={20} aria-hidden strokeWidth={active ? 2.5 : 1.75} />
                  <Text size="xs" fw={active ? 700 : 500} lh={1}>
                    {label}
                  </Text>
                </Stack>
              </UnstyledButton>
            )
          })}
        </Group>
      </AppShell.Footer>
    </AppShell>
  )
}
```

`src/routes/__root.tsx` は sumai-log をコピーし、`title` を `案件パイプライン`、theme-color を `#f6f7f9`（light）/ `#1a1b1e`（dark）に変える。`DatesProvider` は残す（期日入力で使う）。

`src/routes/index.tsx`（仮。Task 9 で置換）:

```tsx
import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '../components/EmptyState'
import { PageShell } from '../components/PageShell'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <PageShell title="ホーム">
      <EmptyState emoji="📋" title="準備中" description="Task 9 でホームを作ります。" />
    </PageShell>
  )
}
```

`public/manifest.json`:

```json
{
  "name": "案件パイプライン",
  "short_name": "案件",
  "lang": "ja",
  "id": "/",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#4c6ef5",
  "background_color": "#f6f7f9",
  "icons": [
    { "src": "/icons/icon-192.png", "type": "image/png", "sizes": "192x192", "purpose": "any" },
    { "src": "/icons/icon-512.png", "type": "image/png", "sizes": "512x512", "purpose": "any" }
  ]
}
```

（アイコンは sumai-log のものを暫定流用。Task 12 のデザイン仕上げで差し替える）

- [ ] **Step 7: `README.md` と `AGENTS.md`（最小。Task 6 と Task 13 で追記する）**

`README.md`:

```markdown
# freelance-pipeline

フリーランスの案件パイプライン管理。選考中の案件を 応募 → 書類 → 商談 → 内定 → 参画 で追い、案件票の原文ごと自分の DB（Cloudflare D1）に残す個人用アプリ。

- 利用者は 1 人（Cloudflare Access で保護）。データはリポジトリに含まれない
- 案件票の構造化は Claude Code 側で行い、`npm run add-case` が zod で検証してから D1 に入れる（アプリは LLM の API キーを持たない）
- スマホで一覧とステータス更新、PC で登録と比較

## 技術構成

TanStack Start on Cloudflare Workers / Mantine v9 / D1 + Drizzle / Cloudflare Access（Google IdP）/ zod 4 / vitest

## セットアップ

```bash
npm install
cp .dev.vars.example .dev.vars   # または keyway pull -e development -f .dev.vars -y
npm run db:migrate:local
npm run dev                       # http://localhost:3000
```

## よく使うコマンド

| | |
|---|---|
| `npm test` | 純粋関数・実 D1・スクリプトのテスト |
| `npm run test:coverage` | `src/lib` の 100% ゲート |
| `npm run check:pii` | 実データ混入の検査 |
| `npm run add-case -- --file=<json> --remote` | 案件票（JSON）を D1 へ |
| `npm run import:history -- --remote` | 過去案件（`history.local.json`）を D1 へ |
| `npm run db:export` | 本番 D1 のバックアップ |
```

`AGENTS.md`:

```markdown
# freelance-pipeline — エージェント向け指示

一人で使う案件パイプライン管理。**リポジトリは public**、データは D1 にしか無い。

## 絶対に守ること

1. **実データをコミットしない。** 企業名・案件名・単価・エージェント名・案件票の原文・メールを
   コード／テスト／seed／コメント／ドキュメント／スクショに書かない。テストは `甲社` `テスト案件`
   `owner@example.com` などの架空値。コミット前に `npm run check:pii`（照合元は gitignore 済みの
   `.dev.vars` と `*.local.json`）。
2. **判断基準をコードに書かない。** 単価下限・時給下限・希望開始月・出社上限・比較の軸名は D1 の
   `settings` に画面から入れる。README にも書かない。
3. **認証を迂回できる経路を足さない。** 判定は `src/lib/access.ts` に集約し、`src/start.ts` の
   グローバルミドルウェアで全リクエストに適用する。fail closed。
4. **秘密は `.dev.vars`（ローカル）と `wrangler secret`（本番）だけ。** `wrangler.jsonc` の `vars` に
   メールを書かない。Keyway は `keyway pull -e development -f .dev.vars -y`。
5. **`src/lib/` は純粋関数のみ。** カバレッジ 100% ゲートの対象。スクリプトが読む lib
   （`enums` `status` `rate` `caseInput`）は lib 内 import に `.ts` 拡張子を付ける。
6. **エラーメッセージ・ログに原文・企業名・単価を載せない**（Workers Observability に流れる）。

## 設計の約束

- 副作用は `src/server/`、DB は `src/db/`、UI は `src/components/` と `src/routes/`
- D1 アクセスは `src/server/repository/<domain>.ts`。server function の zod は `src/server/cases.schema.ts`
  に切り出す（`createServerFn` のラッパーは素の workers テストから import できない）
- 単価は税込が正本（`monthlyMaxIncl`）。税抜→税込は `src/lib/rate.ts` の `toIncl` だけが行う
- `createdAt`/`updatedAt` は両方 `sql\`(datetime('now'))\``。ISO 文字列を混ぜない
- 日付は TEXT の ISO-8601、金額は円の整数、id は text（`crypto.randomUUID()`）
- スマホ優先。下タブ＋FAB＋全画面 Drawer。デスクトップは左ナビ

## スキーマを変えたら

```bash
npm run db:generate
npm run db:migrate:local
npm run cf-typegen
```

## 完了の基準

`npm run format:check` `typecheck` `test:coverage` `test:server` `test:scripts` `build` `check:pii` がすべて green。
認証に触れたら拒否側（JWT なし／署名不正／allowlist 外／本番での dev 経路）で 403 を確認する。

## 参照

仕様: `docs/superpowers/specs/2026-09-16-freelance-pipeline-design.md`
```

- [ ] **Step 8: インストール・生成物・検証**

```bash
cp .dev.vars.example .dev.vars
npx npm@11 install                      # npm 10.9.2 の arborist が落ちる前例あり
npm run db:generate -- --name init_settings
npm run db:migrate:local
npm run cf-typegen
npm run generate-routes
npm run format
npm run format:check && npm run typecheck && npm run test:coverage && npm run test:server && npm run build && npm run check:pii
```

`test:server` は `src/server/**/*.worker-test.ts` が 0 件なので「No test files found」で終わる（vitest は exit 1 になる）。`vitest.workers.config.ts` の `test` に `passWithNoTests: true` を足して green にする（Task 2 でテストが入ったら外す）。

`test:scripts` も `scripts/lib/*.test.ts` が無いとシェルの glob が展開されず落ちる。仮の煙テストを置く（Task 6 で消す）:

```ts
// scripts/lib/smoke.test.ts（Task 6 で削除）
import assert from 'node:assert/strict'
import { it } from 'node:test'

it('strip-types で TS のテストが走る', () => {
  const n: number = 1
  assert.equal(n, 1)
})
```

`npm run test:scripts` → 1 passed。

- [ ] **Step 9: 動作確認（dev サーバー）**

`npm run dev` をバックグラウンドで起動し、`curl -s http://localhost:3000/ | grep -c 'ホーム'` が 1 以上。下タブが 4 つ出ることを Playwright MCP（390×844）で確認。終わったら dev サーバーを止める。

- [ ] **Step 10: コミットと GitHub リポジトリ（public）**

```bash
git add -A
git commit -m "chore: sumai-log を雛形に土台を構築（認証・シェル・CI・スキーマ最小）

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
gh repo create tktk7l9/freelance-pipeline --public --source=. --remote=origin --push
```

`gh repo create` の前に `git log --oneline` で 2 コミット（仕様＋土台）だけであること、`git ls-files | grep -c local.json` が 0 であることを確認する。

---

### Task 2: スキーマ（全表）・ステータス lib・マイグレーション

**Files:**
- Create: `src/lib/status.ts` `src/lib/status.test.ts` `src/server/repository/test-helpers.ts` `src/server/repository/schema.worker-test.ts`
- Modify: `src/db/schema.ts`（全表）
- Generate: `drizzle/migrations/0001_init_tables.sql`

**Interfaces:**
- Produces: `PROGRESS_STATUSES` `SIDE_STATUSES` `CASE_STATUSES` `type CaseStatus` `STATUS_LABEL` `STATUS_COLOR` `STATUS_GROUPS` `type StatusGroup` `STATUS_GROUP_LABEL` `statusGroup(s): StatusGroup` `isTerminal(s): boolean` `progressRank(s): number` `canTransition(from, to): boolean`（`src/lib/status.ts`）／テーブル `cases` `caseLog` `settings` と型 `Case` `NewCase` `CaseLogRow` `NewCaseLog`（`src/db/schema.ts`）／`db` `reset()`（`test-helpers.ts`）

- [ ] **Step 1: `src/lib/status.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import {
  CASE_STATUSES,
  PROGRESS_STATUSES,
  STATUS_LABEL,
  canTransition,
  isTerminal,
  progressRank,
  statusGroup,
} from './status'

describe('status', () => {
  it('全ステータスにラベルがある', () => {
    for (const s of CASE_STATUSES) expect(STATUS_LABEL[s]).toBeTruthy()
  })

  it('進行は後ろにだけ進める（飛ばしは可）', () => {
    expect(canTransition('saved', 'applied')).toBe(true)
    expect(canTransition('saved', 'meeting')).toBe(true)
    expect(canTransition('meeting', 'applied')).toBe(false)
    expect(canTransition('applied', 'applied')).toBe(false)
    expect(progressRank('offer')).toBeGreaterThan(progressRank('meeting'))
    expect(progressRank('declined')).toBe(-1)
  })

  it('別枠へはどこからでも行ける', () => {
    for (const s of PROGRESS_STATUSES) {
      expect(canTransition(s, 'declined')).toBe(true)
      expect(canTransition(s, 'rejected')).toBe(true)
      expect(canTransition(s, 'onhold')).toBe(true)
    }
  })

  it('onhold からは進行のどこへでも戻れる', () => {
    expect(canTransition('onhold', 'saved')).toBe(true)
    expect(canTransition('onhold', 'joined')).toBe(true)
    expect(canTransition('onhold', 'declined')).toBe(true)
  })

  it('declined / rejected は終端', () => {
    expect(isTerminal('declined')).toBe(true)
    expect(isTerminal('rejected')).toBe(true)
    expect(isTerminal('onhold')).toBe(false)
    expect(canTransition('declined', 'saved')).toBe(false)
    expect(canTransition('rejected', 'onhold')).toBe(false)
  })

  it('グループ分け', () => {
    expect(statusGroup('saved')).toBe('active')
    expect(statusGroup('offer')).toBe('active')
    expect(statusGroup('joined')).toBe('history')
    expect(statusGroup('ended')).toBe('history')
    expect(statusGroup('onhold')).toBe('onhold')
    expect(statusGroup('declined')).toBe('closed')
    expect(statusGroup('rejected')).toBe('closed')
  })
})
```

- [ ] **Step 2: 失敗を確認** — `npx vitest run src/lib/status.test.ts` → FAIL（module not found）

- [ ] **Step 3: `src/lib/status.ts`**

```ts
/**
 * 案件のステータス。進行は一方向、別枠はどこからでも。
 * スクリプトからも読むので lib 内の import は持たない。
 */
export const PROGRESS_STATUSES = [
  'saved',
  'applied',
  'screening',
  'meeting',
  'offer',
  'joined',
  'ended',
] as const
export const SIDE_STATUSES = ['declined', 'rejected', 'onhold'] as const
export const CASE_STATUSES = [...PROGRESS_STATUSES, ...SIDE_STATUSES] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

export const STATUS_LABEL: Record<CaseStatus, string> = {
  saved: '保存',
  applied: '応募',
  screening: '書類選考',
  meeting: '商談',
  offer: '内定',
  joined: '参画',
  ended: '終了',
  declined: '辞退',
  rejected: '見送り',
  onhold: '保留',
}

export const STATUS_COLOR: Record<CaseStatus, string> = {
  saved: 'gray',
  applied: 'blue',
  screening: 'cyan',
  meeting: 'indigo',
  offer: 'grape',
  joined: 'teal',
  ended: 'gray',
  declined: 'gray',
  rejected: 'red',
  onhold: 'yellow',
}

/** 一覧のチップ。active=進行中 / onhold=保留 / closed=辞退・見送り / history=参画・終了 */
export const STATUS_GROUPS = ['active', 'onhold', 'closed', 'history'] as const
export type StatusGroup = (typeof STATUS_GROUPS)[number]
export const STATUS_GROUP_LABEL: Record<StatusGroup, string> = {
  active: '進行中',
  onhold: '保留',
  closed: '辞退・見送り',
  history: '参画・終了',
}

export function statusGroup(status: CaseStatus): StatusGroup {
  if (status === 'onhold') return 'onhold'
  if (status === 'declined' || status === 'rejected') return 'closed'
  if (status === 'joined' || status === 'ended') return 'history'
  return 'active'
}

export function isTerminal(status: CaseStatus): boolean {
  return status === 'declined' || status === 'rejected'
}

/** 進行の順位。別枠は -1 */
export function progressRank(status: CaseStatus): number {
  return (PROGRESS_STATUSES as readonly string[]).indexOf(status)
}

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  if (from === to) return false
  if (isTerminal(from)) return false
  if ((SIDE_STATUSES as readonly string[]).includes(to)) return true
  if (from === 'onhold') return true
  return progressRank(to) > progressRank(from)
}
```

- [ ] **Step 4: 通過確認** — `npx vitest run src/lib/status.test.ts` → PASS

- [ ] **Step 5: `src/db/schema.ts` を全表にする**

```ts
import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { LOG_KINDS, REMOTE_TYPES, ROUTES, TAX_BASES } from '../lib/enums'
import { CASE_STATUSES } from '../lib/status'

/**
 * 方針: 日付は TEXT の ISO-8601（日付のみ 'YYYY-MM-DD'、月のみ 'YYYY-MM'）、
 * 金額は円の整数、id は text（crypto.randomUUID()）。
 * createdAt / updatedAt は両方 datetime('now')（1 列 2 書式にしない）。
 */
export const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`),
}

const id = () => text('id').primaryKey()
const jsonList = (name: string) =>
  text(name, { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`)

/** 判断基準（thresholds / axes）はここにだけ置く。コードに書かない */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamps.updatedAt,
})

/** 1 行 = 1 案件。選考中も過去案件も同じ表 */
export const cases = sqliteTable(
  'cases',
  {
    id: id(),
    company: text('company').notNull(),
    title: text('title').notNull(),
    route: text('route', { enum: ROUTES }).notNull(),
    /** 担当エージェント名（誰に聞くか） */
    agentName: text('agent_name'),
    /** 単価上限・税込（円）。列名に Incl を入れて取り違えを型で防ぐ */
    monthlyMaxIncl: integer('monthly_max_incl').notNull(),
    monthlyMinIncl: integer('monthly_min_incl'),
    /** 案件票の表示がどちらだったか。×1.1 は src/lib/rate.ts の toIncl が行う */
    sourceTaxBasis: text('source_tax_basis', { enum: TAX_BASES }).notNull(),
    settlementMinH: integer('settlement_min_h'),
    settlementMaxH: integer('settlement_max_h'),
    remoteType: text('remote_type', { enum: REMOTE_TYPES }).notNull(),
    onsiteNote: text('onsite_note'),
    /** 'YYYY-MM-DD' または 'YYYY-MM' */
    startDate: text('start_date').notNull(),
    endDate: text('end_date'),
    daysPerWeek: text('days_per_week'),
    workLocation: text('work_location'),
    supplyChain: text('supply_chain'),
    paymentSiteDays: integer('payment_site_days'),
    sourceUrl: text('source_url'),
    mustSkills: jsonList('must_skills'),
    niceSkills: jsonList('nice_skills'),
    /** 案件票の原文そのまま */
    rawText: text('raw_text').notNull(),
    status: text('status', { enum: CASE_STATUSES }).notNull().default('saved'),
    nextAction: text('next_action'),
    nextActionDue: text('next_action_due'),
    /** settings.axes に対応する 0〜2。比較ビューで ○△× */
    fitScores: text('fit_scores', { mode: 'json' }).$type<number[]>(),
    /** 過去案件の実単価・税込 */
    actualMonthlyIncl: integer('actual_monthly_incl'),
    note: text('note'),
    ...timestamps,
  },
  (t) => [
    index('cases_status_idx').on(t.status),
    index('cases_due_idx').on(t.nextActionDue),
    uniqueIndex('cases_source_url_unique').on(t.sourceUrl),
  ],
)

/** 経緯。ステータス変更は自動で 1 行、メモは日付つきで手で足す */
export const caseLog = sqliteTable(
  'case_log',
  {
    id: id(),
    caseId: text('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    /** ISO-8601 日時 */
    at: text('at').notNull(),
    kind: text('kind', { enum: LOG_KINDS }).notNull(),
    fromStatus: text('from_status'),
    toStatus: text('to_status'),
    body: text('body').notNull().default(''),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('case_log_case_idx').on(t.caseId, t.at)],
)

export type Case = typeof cases.$inferSelect
export type NewCase = typeof cases.$inferInsert
export type CaseLogRow = typeof caseLog.$inferSelect
export type NewCaseLog = typeof caseLog.$inferInsert
export type Setting = typeof settings.$inferSelect
```

- [ ] **Step 6: マイグレーション生成と適用**

```bash
npm run db:generate -- --name init_tables
npm run db:migrate:local
grep -c 'INSERT' drizzle/migrations/*.sql   # 0 であること（DDL のみ）
```

- [ ] **Step 7: `src/server/repository/test-helpers.ts` と煙テスト**

```ts
// src/server/repository/test-helpers.ts
import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'

import * as schema from '../../db/schema'

export const db = drizzle(env.DB, { schema })

/** 全テーブルを空にする。db/schema.ts の全テーブルを網羅すること */
export async function reset() {
  for (const t of ['case_log', 'cases', 'settings']) {
    await env.DB.exec(`DELETE FROM ${t}`)
  }
}

/** テスト用の最小の案件行（架空値） */
export function fakeCase(overrides: Partial<schema.NewCase> = {}): schema.NewCase {
  return {
    id: crypto.randomUUID(),
    company: '甲社',
    title: 'テスト案件',
    route: 'findy',
    monthlyMaxIncl: 1_100_000,
    sourceTaxBasis: 'excl',
    remoteType: 'full',
    startDate: '2030-01',
    rawText: '原文',
    ...overrides,
  }
}
```

```ts
// src/server/repository/schema.worker-test.ts
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'

import { caseLog, cases } from '../../db/schema'
import { db, fakeCase, reset } from './test-helpers'

beforeEach(reset)

describe('schema', () => {
  it('cases と case_log を書けて、削除で CASCADE する', async () => {
    const row = fakeCase()
    await db.insert(cases).values(row)
    await db.insert(caseLog).values({
      id: crypto.randomUUID(),
      caseId: row.id,
      at: '2030-01-01T00:00:00+09:00',
      kind: 'import',
      body: 'テスト',
    })
    const [saved] = await db.select().from(cases).where(eq(cases.id, row.id))
    expect(saved.mustSkills).toEqual([])
    expect(saved.status).toBe('saved')
    expect(saved.createdAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    await db.delete(cases).where(eq(cases.id, row.id))
    expect(await db.select().from(caseLog)).toHaveLength(0)
  })

  it('source_url は重複を拒むが NULL は複数入る', async () => {
    await db.insert(cases).values(fakeCase({ sourceUrl: null }))
    await db.insert(cases).values(fakeCase({ sourceUrl: null }))
    await db.insert(cases).values(fakeCase({ sourceUrl: 'https://example.com/a' }))
    await expect(
      db.insert(cases).values(fakeCase({ sourceUrl: 'https://example.com/a' })),
    ).rejects.toThrow()
  })
})
```

`vitest.workers.config.ts` の `passWithNoTests: true` を外す。

- [ ] **Step 8: 検証とコミット**

```bash
npm run test:server && npm run test:coverage && npm run typecheck && npm run format && npm run check:pii
git add -A
git commit -m "feat(db): cases / case_log / settings のスキーマとステータス遷移

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: lib — 単価（rate）と投入契約（caseInput）

**Files:**
- Create: `src/lib/rate.ts` `src/lib/rate.test.ts` `src/lib/caseInput.ts` `src/lib/caseInput.test.ts`

**Interfaces:**
- Consumes: `ROUTES` `TAX_BASES` `REMOTE_TYPES` `type Route` `type TaxBasis`（`enums.ts`）／`CASE_STATUSES`（`status.ts`）
- Produces（`rate.ts`）: `TAX_RATE = 1.1`／`DEFAULT_BASE_HOURS: Record<Route, number>`／`toIncl(amount, basis): number`／`toExcl(incl): number`／`baseHours({ route, settlementMinH, settlementMaxH }): { hours: number; source: 'range' | 'min' | 'max' | 'route' }`／`hourlyExcl(monthlyIncl, hours): number`／`formatMan(yen): string`／`median(values: number[]): number | null`
- Produces（`caseInput.ts`）: `caseInputSchema`／`type CaseInput = z.infer<typeof caseInputSchema>`／`type CaseRowValues`／`toCaseRow(input: CaseInput): CaseRowValues`／`parseCaseJson(text: string): { ok: true; input: CaseInput } | { ok: false; issues: { path: string; message: string }[] }`／`CASE_JSON_EXAMPLE: string`

- [ ] **Step 1: `src/lib/rate.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { baseHours, formatMan, hourlyExcl, median, toExcl, toIncl } from './rate'

describe('rate', () => {
  it('税抜表示は ×1.1 して丸める。税込表示はそのまま', () => {
    expect(toIncl(1_120_000, 'excl')).toBe(1_232_000)
    expect(toIncl(1_050_000, 'incl')).toBe(1_050_000)
    expect(toIncl(954_545, 'excl')).toBe(1_050_000)
  })

  it('税抜は ÷1.1 して丸める', () => {
    expect(toExcl(1_320_000)).toBe(1_200_000)
    expect(toExcl(1_050_000)).toBe(954_545)
  })

  it('基準時間は精算幅の中点 → 片方 → 経路既定 の順', () => {
    expect(baseHours({ route: 'findy', settlementMinH: 140, settlementMaxH: 180 })).toEqual({
      hours: 160,
      source: 'range',
    })
    expect(baseHours({ route: 'levtech', settlementMinH: 150, settlementMaxH: null })).toEqual({
      hours: 150,
      source: 'min',
    })
    expect(baseHours({ route: 'levtech', settlementMinH: null, settlementMaxH: 180 })).toEqual({
      hours: 180,
      source: 'max',
    })
    expect(baseHours({ route: 'findy', settlementMinH: null, settlementMaxH: null })).toEqual({
      hours: 160,
      source: 'route',
    })
    expect(baseHours({ route: 'levtech', settlementMinH: null, settlementMaxH: null }).hours).toBe(
      168,
    )
    expect(baseHours({ route: 'direct', settlementMinH: null, settlementMaxH: null }).hours).toBe(
      160,
    )
  })

  it('時給（税抜）= 税抜 ÷ 基準時間', () => {
    expect(hourlyExcl(924_000, 160)).toBe(5_250)
    expect(hourlyExcl(792_000, 168)).toBe(4_286)
  })

  it('万円表示は小数 1 桁まで', () => {
    expect(formatMan(1_320_000)).toBe('132万')
    expect(formatMan(1_232_000)).toBe('123.2万')
    expect(formatMan(954_545)).toBe('95.5万')
    expect(formatMan(null)).toBe('—')
  })

  it('中央値', () => {
    expect(median([])).toBeNull()
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })
})
```

- [ ] **Step 2: 失敗確認** — `npx vitest run src/lib/rate.test.ts` → FAIL

- [ ] **Step 3: `src/lib/rate.ts`**

```ts
import type { Route, TaxBasis } from './enums.ts'

/** 消費税率。税込が正本で、税抜表示の案件票だけここを通して税込にする */
export const TAX_RATE = 1.1

/** 精算幅が無いときの基準時間（経路ごと）。時給換算の分母 */
export const DEFAULT_BASE_HOURS: Record<Route, number> = {
  findy: 160,
  levtech: 168,
  direct: 160,
  other: 160,
}

export function toIncl(amount: number, basis: TaxBasis): number {
  return basis === 'excl' ? Math.round(amount * TAX_RATE) : amount
}

export function toExcl(incl: number): number {
  return Math.round(incl / TAX_RATE)
}

export type BaseHoursSource = 'range' | 'min' | 'max' | 'route'

export function baseHours({
  route,
  settlementMinH,
  settlementMaxH,
}: {
  route: Route
  settlementMinH: number | null
  settlementMaxH: number | null
}): { hours: number; source: BaseHoursSource } {
  if (settlementMinH !== null && settlementMaxH !== null) {
    return { hours: (settlementMinH + settlementMaxH) / 2, source: 'range' }
  }
  if (settlementMinH !== null) return { hours: settlementMinH, source: 'min' }
  if (settlementMaxH !== null) return { hours: settlementMaxH, source: 'max' }
  return { hours: DEFAULT_BASE_HOURS[route], source: 'route' }
}

/** 時給（税抜）。monthlyIncl は税込 */
export function hourlyExcl(monthlyIncl: number, hours: number): number {
  return Math.round(toExcl(monthlyIncl) / hours)
}

export function formatMan(yen: number | null | undefined): string {
  if (yen === null || yen === undefined) return '—'
  const man = Math.round(yen / 1_000) / 10
  return `${man.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
```

- [ ] **Step 4: 通過確認** — `npx vitest run src/lib/rate.test.ts` → PASS

- [ ] **Step 5: `src/lib/caseInput.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { CASE_JSON_EXAMPLE, caseInputSchema, parseCaseJson, toCaseRow } from './caseInput'

const minimal = {
  company: '甲社',
  title: 'テスト案件',
  route: 'findy',
  monthlyMax: 1_120_000,
  taxBasis: 'excl',
  remoteType: 'full',
  startDate: '2030-01',
  rawText: '原文',
}

describe('caseInputSchema', () => {
  it('最小の JSON を受け、省略項目は null / [] / saved になる', () => {
    const input = caseInputSchema.parse(minimal)
    expect(input.monthlyMin).toBeNull()
    expect(input.mustSkills).toEqual([])
    expect(input.status).toBe('saved')
    expect(input.fitScores).toBeNull()
  })

  it('空文字の任意項目は null に寄せる', () => {
    const input = caseInputSchema.parse({ ...minimal, agentName: '  ', note: '' })
    expect(input.agentName).toBeNull()
    expect(input.note).toBeNull()
  })

  it('開始は YYYY-MM-DD か YYYY-MM。期日は YYYY-MM-DD', () => {
    expect(caseInputSchema.safeParse({ ...minimal, startDate: '2030/01' }).success).toBe(false)
    expect(caseInputSchema.safeParse({ ...minimal, startDate: '2030-01-15' }).success).toBe(true)
    expect(caseInputSchema.safeParse({ ...minimal, nextActionDue: '2030-01' }).success).toBe(false)
  })

  it('URL は http(s) のみ', () => {
    expect(caseInputSchema.safeParse({ ...minimal, sourceUrl: 'javascript:alert(1)' }).success).toBe(
      false,
    )
    expect(caseInputSchema.safeParse({ ...minimal, sourceUrl: 'https://example.com' }).success).toBe(
      true,
    )
  })

  it('下限 > 上限、精算幅の逆転を拒む', () => {
    expect(caseInputSchema.safeParse({ ...minimal, monthlyMin: 2_000_000 }).success).toBe(false)
    expect(
      caseInputSchema.safeParse({ ...minimal, settlementMinH: 180, settlementMaxH: 140 }).success,
    ).toBe(false)
  })
})

describe('toCaseRow', () => {
  it('税抜表示は税込に直し、基準を残す', () => {
    const row = toCaseRow(caseInputSchema.parse({ ...minimal, monthlyMin: 1_000_000 }))
    expect(row.monthlyMaxIncl).toBe(1_232_000)
    expect(row.monthlyMinIncl).toBe(1_100_000)
    expect(row.sourceTaxBasis).toBe('excl')
  })

  it('税込表示はそのまま', () => {
    const row = toCaseRow(caseInputSchema.parse({ ...minimal, taxBasis: 'incl' }))
    expect(row.monthlyMaxIncl).toBe(1_120_000)
    expect(row.sourceTaxBasis).toBe('incl')
  })
})

describe('parseCaseJson', () => {
  it('壊れた JSON は issues で返す', () => {
    const r = parseCaseJson('{not json')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues[0].path).toBe('')
  })

  it('検証エラーは項目名つき', () => {
    const r = parseCaseJson(JSON.stringify({ ...minimal, company: '' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues.map((i) => i.path)).toContain('company')
  })

  it('例の JSON はそのまま通る', () => {
    expect(parseCaseJson(CASE_JSON_EXAMPLE).ok).toBe(true)
  })
})
```

- [ ] **Step 6: 失敗確認** — `npx vitest run src/lib/caseInput.test.ts` → FAIL

- [ ] **Step 7: `src/lib/caseInput.ts`**

```ts
import { z } from 'zod'

import { REMOTE_TYPES, ROUTES, TAX_BASES } from './enums.ts'
import { toIncl } from './rate.ts'
import { CASE_STATUSES } from './status.ts'

/**
 * Claude Code が書く JSON の契約。scripts/add-case.ts と /import フォームが同じものを使う。
 * 金額は案件票の表示のまま（taxBasis で税込/税抜を宣言）。税込化は toCaseRow が行う。
 */
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .default(null)

const nullableInt = (min: number, max: number) => z.number().int().min(min).max(max).nullable().default(null)

const YEAR_MONTH_OR_DATE = /^\d{4}-\d{2}(-\d{2})?$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const caseInputSchema = z
  .object({
    company: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(300),
    route: z.enum(ROUTES),
    agentName: nullableText(100),
    monthlyMax: z.number().int().min(1).max(100_000_000),
    monthlyMin: nullableInt(1, 100_000_000),
    taxBasis: z.enum(TAX_BASES),
    settlementMinH: nullableInt(1, 400),
    settlementMaxH: nullableInt(1, 400),
    remoteType: z.enum(REMOTE_TYPES),
    onsiteNote: nullableText(200),
    startDate: z.string().regex(YEAR_MONTH_OR_DATE),
    endDate: z.string().regex(YEAR_MONTH_OR_DATE).nullable().default(null),
    daysPerWeek: nullableText(50),
    workLocation: nullableText(200),
    supplyChain: nullableText(200),
    paymentSiteDays: nullableInt(0, 365),
    sourceUrl: z
      .string()
      .trim()
      .max(500)
      .transform((v) => (v === '' ? null : v))
      .nullable()
      .default(null)
      .refine((v) => v === null || /^https?:\/\//.test(v), 'URL は http(s):// で始めてください'),
    mustSkills: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    niceSkills: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
    rawText: z.string().min(1).max(50_000),
    status: z.enum(CASE_STATUSES).default('saved'),
    nextAction: nullableText(200),
    nextActionDue: z.string().regex(DATE).nullable().default(null),
    fitScores: z.array(z.number().int().min(0).max(2)).max(10).nullable().default(null),
    actualMonthlyIncl: nullableInt(1, 100_000_000),
    note: nullableText(4000),
  })
  .refine((v) => v.monthlyMin === null || v.monthlyMin <= v.monthlyMax, {
    message: '単価の下限が上限を超えています',
    path: ['monthlyMin'],
  })
  .refine(
    (v) => v.settlementMinH === null || v.settlementMaxH === null || v.settlementMinH <= v.settlementMaxH,
    { message: '精算幅の下限が上限を超えています', path: ['settlementMinH'] },
  )

export type CaseInput = z.infer<typeof caseInputSchema>

/** cases テーブルの列（id・timestamps を除く）。schema.ts の NewCase と同じ名前にする */
export type CaseRowValues = {
  company: string
  title: string
  route: CaseInput['route']
  agentName: string | null
  monthlyMaxIncl: number
  monthlyMinIncl: number | null
  sourceTaxBasis: CaseInput['taxBasis']
  settlementMinH: number | null
  settlementMaxH: number | null
  remoteType: CaseInput['remoteType']
  onsiteNote: string | null
  startDate: string
  endDate: string | null
  daysPerWeek: string | null
  workLocation: string | null
  supplyChain: string | null
  paymentSiteDays: number | null
  sourceUrl: string | null
  mustSkills: string[]
  niceSkills: string[]
  rawText: string
  status: CaseInput['status']
  nextAction: string | null
  nextActionDue: string | null
  fitScores: number[] | null
  actualMonthlyIncl: number | null
  note: string | null
}

export function toCaseRow(input: CaseInput): CaseRowValues {
  const { monthlyMax, monthlyMin, taxBasis, ...rest } = input
  return {
    ...rest,
    monthlyMaxIncl: toIncl(monthlyMax, taxBasis),
    monthlyMinIncl: monthlyMin === null ? null : toIncl(monthlyMin, taxBasis),
    sourceTaxBasis: taxBasis,
  }
}

export type CaseJsonIssue = { path: string; message: string }

export function parseCaseJson(
  text: string,
): { ok: true; input: CaseInput } | { ok: false; issues: CaseJsonIssue[] } {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, issues: [{ path: '', message: 'JSON として読めません' }] }
  }
  const result = caseInputSchema.safeParse(json)
  if (result.success) return { ok: true, input: result.data }
  return {
    ok: false,
    issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  }
}

/** AGENTS.md と /import の placeholder に出す例（架空値） */
export const CASE_JSON_EXAMPLE = JSON.stringify(
  {
    company: '甲社',
    title: 'テスト案件（サンプル）',
    route: 'findy',
    agentName: null,
    monthlyMax: 1120000,
    monthlyMin: null,
    taxBasis: 'excl',
    settlementMinH: 140,
    settlementMaxH: 180,
    remoteType: 'full',
    onsiteNote: null,
    startDate: '2030-01',
    daysPerWeek: '週4〜5',
    workLocation: null,
    supplyChain: null,
    paymentSiteDays: null,
    sourceUrl: 'https://example.com/jobs/1',
    mustSkills: ['TypeScript', 'React'],
    niceSkills: ['Cloudflare'],
    rawText: '（案件票の原文をそのまま）',
    status: 'saved',
    nextAction: null,
    nextActionDue: null,
    note: null,
  },
  null,
  2,
)
```

- [ ] **Step 8: 通過とカバレッジ・strip-types での読み込み確認**

```bash
npx vitest run src/lib/caseInput.test.ts src/lib/rate.test.ts
npm run test:coverage
node --experimental-strip-types -e "import('./src/lib/caseInput.ts').then(m => console.log(Object.keys(m)))"
```

最後の行で `caseInputSchema, toCaseRow, parseCaseJson, CASE_JSON_EXAMPLE` が出ること（Node から lib が読めることの確認。出なければ import の `.ts` 拡張子漏れ）。

- [ ] **Step 9: コミット**

```bash
npm run format && npm run check:pii
git add -A
git commit -m "feat(lib): 単価の税込化・時給換算と案件票 JSON の zod 契約

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: lib — 期日（deadlines）・ログ（caseLog）・比較（compare）

**Files:**
- Create: `src/lib/deadlines.ts` `src/lib/deadlines.test.ts` `src/lib/caseLog.ts` `src/lib/caseLog.test.ts` `src/lib/compare.ts` `src/lib/compare.test.ts`

**Interfaces:**
- Consumes: `formatJst`（`jst.ts`）／`STATUS_LABEL`（`status.ts`）／`baseHours` `hourlyExcl` `toExcl` `formatMan`（`rate.ts`）／`REMOTE_LABEL` `ROUTE_LABEL`（`enums.ts`）
- Produces（`deadlines.ts`）: `type DueState = 'overdue' | 'today' | 'soon' | 'later'`／`dueState(due: string, today: string): DueState`／`withDue<T extends { nextActionDue: string | null }>(items: T[]): T[]`（期日ありだけを昇順）
- Produces（`caseLog.ts`）: `type LogLike = { id: string; at: string; kind: LogKind; fromStatus: string | null; toStatus: string | null; body: string }`／`describeLog(entry: LogLike): string`／`formatLogAt(entry: LogLike): string`／`sortLogNewestFirst<T extends LogLike>(entries: T[]): T[]`／`memoAt(date: string): string`（`YYYY-MM-DD` → `YYYY-MM-DDT12:00:00+09:00`）
- Produces（`compare.ts`）: `type Thresholds`／`DEFAULT_THRESHOLDS`／`parseThresholds(raw: string | null): Thresholds`／`parseAxes(raw: string | null): string[]`／`type CompareCase`／`type CompareCell = { caseId: string; text: string; bad: boolean }`／`type CompareRow = { key: string; label: string; cells: CompareCell[] }`／`buildCompareRows(cases: CompareCase[], thresholds: Thresholds, axes: string[]): CompareRow[]`／`fitMark(score: number | null | undefined): string`／`onsitePerMonth(remoteType, onsiteNote): number | null`

- [ ] **Step 1: `src/lib/deadlines.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { dueState, withDue } from './deadlines'

describe('deadlines', () => {
  it('期限状態', () => {
    expect(dueState('2030-01-01', '2030-01-02')).toBe('overdue')
    expect(dueState('2030-01-02', '2030-01-02')).toBe('today')
    expect(dueState('2030-01-05', '2030-01-02')).toBe('soon')
    expect(dueState('2030-01-06', '2030-01-02')).toBe('later')
  })

  it('期日ありだけを昇順に', () => {
    const items = [
      { id: 'a', nextActionDue: '2030-01-05' },
      { id: 'b', nextActionDue: null },
      { id: 'c', nextActionDue: '2030-01-01' },
    ]
    expect(withDue(items).map((i) => i.id)).toEqual(['c', 'a'])
  })
})
```

- [ ] **Step 2: `src/lib/deadlines.ts`**

```ts
export type DueState = 'overdue' | 'today' | 'soon' | 'later'

/** 'YYYY-MM-DD' 同士の差（日）。文字列比較で足りるが、soon の判定に日数が要る */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** today は呼び出し側が JST で決めて渡す（lib は時計を持たない） */
export function dueState(due: string, today: string): DueState {
  const d = daysBetween(today, due)
  if (d < 0) return 'overdue'
  if (d === 0) return 'today'
  if (d <= 3) return 'soon'
  return 'later'
}

export function withDue<T extends { nextActionDue: string | null }>(items: T[]): T[] {
  return items
    .filter((i): i is T & { nextActionDue: string } => i.nextActionDue !== null)
    .sort((a, b) => a.nextActionDue.localeCompare(b.nextActionDue))
}
```

- [ ] **Step 3: `npx vitest run src/lib/deadlines.test.ts` → PASS**

- [ ] **Step 4: `src/lib/caseLog.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import { describeLog, formatLogAt, memoAt, sortLogNewestFirst } from './caseLog'

const base = { id: 'x', body: '', fromStatus: null, toStatus: null }

describe('caseLog', () => {
  it('ステータス変更は「A → B」', () => {
    expect(
      describeLog({ ...base, at: '2030-01-01T00:00:00Z', kind: 'status', fromStatus: 'applied', toStatus: 'meeting' }),
    ).toBe('応募 → 商談')
  })
  it('取込・メモは本文', () => {
    expect(describeLog({ ...base, at: '2030-01-01T00:00:00Z', kind: 'import', body: 'add-case' })).toBe(
      '取込: add-case',
    )
    expect(describeLog({ ...base, at: '2030-01-01T00:00:00Z', kind: 'memo', body: '面談日程' })).toBe(
      '面談日程',
    )
  })
  it('メモは日付だけ、それ以外は日時', () => {
    expect(formatLogAt({ ...base, at: '2030-01-01T12:00:00+09:00', kind: 'memo' })).toBe('2030-01-01')
    expect(formatLogAt({ ...base, at: '2030-01-01 03:00:00', kind: 'status' })).toBe('2030-01-01 12:00')
  })
  it('新しい順（同時刻は id で安定）', () => {
    const rows = [
      { ...base, id: 'a', at: '2030-01-01T00:00:00Z', kind: 'memo' as const },
      { ...base, id: 'b', at: '2030-01-02T00:00:00Z', kind: 'memo' as const },
      { ...base, id: 'c', at: '2030-01-01T00:00:00Z', kind: 'memo' as const },
    ]
    expect(sortLogNewestFirst(rows).map((r) => r.id)).toEqual(['b', 'c', 'a'])
  })
  it('メモの at は JST 正午', () => {
    expect(memoAt('2030-01-01')).toBe('2030-01-01T12:00:00+09:00')
  })
})
```

- [ ] **Step 5: `src/lib/caseLog.ts`**

```ts
import type { LogKind } from './enums'
import { formatJst } from './jst'
import { STATUS_LABEL, type CaseStatus } from './status'

export type LogLike = {
  id: string
  at: string
  kind: LogKind
  fromStatus: string | null
  toStatus: string | null
  body: string
}

function label(status: string | null): string {
  return status && status in STATUS_LABEL ? STATUS_LABEL[status as CaseStatus] : '—'
}

export function describeLog(entry: LogLike): string {
  if (entry.kind === 'status') return `${label(entry.fromStatus)} → ${label(entry.toStatus)}`
  if (entry.kind === 'import') return `取込: ${entry.body}`
  return entry.body
}

/** メモは日付だけを見せる（時刻は正午に固定しているので意味が無い） */
export function formatLogAt(entry: LogLike): string {
  return formatJst(entry.at, { withTime: entry.kind !== 'memo' })
}

export function sortLogNewestFirst<T extends LogLike>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id))
}

/** 日付だけのメモを JST の正午に置く（UTC に直しても日付が変わらない） */
export function memoAt(date: string): string {
  return `${date}T12:00:00+09:00`
}
```

- [ ] **Step 6: `npx vitest run src/lib/caseLog.test.ts` → PASS**

- [ ] **Step 7: `src/lib/compare.test.ts`**

```ts
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_THRESHOLDS,
  buildCompareRows,
  fitMark,
  onsitePerMonth,
  parseAxes,
  parseThresholds,
  type CompareCase,
} from './compare'

const a: CompareCase = {
  id: 'a',
  company: '甲社',
  title: 'A案件',
  route: 'findy',
  monthlyMaxIncl: 1_320_000,
  monthlyMinIncl: null,
  settlementMinH: 140,
  settlementMaxH: 180,
  remoteType: 'full',
  onsiteNote: null,
  startDate: '2030-01',
  daysPerWeek: '週5',
  supplyChain: null,
  paymentSiteDays: null,
  mustSkills: ['TypeScript'],
  niceSkills: [],
  fitScores: [2, 1, 0],
}
const b: CompareCase = {
  ...a,
  id: 'b',
  company: '乙社',
  title: 'B案件',
  route: 'levtech',
  monthlyMaxIncl: 850_000,
  settlementMinH: null,
  settlementMaxH: null,
  remoteType: 'partial',
  onsiteNote: '月4回出社',
  startDate: '2030-03',
  fitScores: null,
}

describe('compare', () => {
  it('閾値と軸の parse（壊れた値は既定）', () => {
    expect(parseThresholds(null)).toEqual(DEFAULT_THRESHOLDS)
    expect(parseThresholds('{bad')).toEqual(DEFAULT_THRESHOLDS)
    expect(parseThresholds(JSON.stringify({ minMonthlyIncl: 900_000, targetStart: '2030-02' }))).toEqual({
      ...DEFAULT_THRESHOLDS,
      minMonthlyIncl: 900_000,
      targetStart: '2030-02',
    })
    expect(parseAxes(null)).toEqual([])
    expect(parseAxes(JSON.stringify(['a', 1, 'b']))).toEqual(['a', 'b'])
  })

  it('出社回数', () => {
    expect(onsitePerMonth('full', null)).toBe(0)
    expect(onsitePerMonth('partial', '月4回出社')).toBe(4)
    expect(onsitePerMonth('partial', '初日のみ')).toBeNull()
    expect(onsitePerMonth('onsite', null)).toBe(Number.POSITIVE_INFINITY)
  })

  it('○△×', () => {
    expect(fitMark(2)).toBe('○')
    expect(fitMark(1)).toBe('△')
    expect(fitMark(0)).toBe('×')
    expect(fitMark(null)).toBe('—')
  })

  it('行列化と閾値ハイライト', () => {
    const rows = buildCompareRows([a, b], {
      minMonthlyIncl: 1_000_000,
      minHourlyExcl: 6_000,
      targetStart: '2030-02',
      maxOnsitePerMonth: 1,
    }, ['軸1', '軸2', '軸3'])
    const row = (key: string) => rows.find((r) => r.key === key)!
    expect(row('monthlyIncl').cells.map((c) => c.bad)).toEqual([false, true])
    expect(row('hourly').cells[0].text).toBe('7,500円 (÷160h)')
    expect(row('hourly').cells[1].bad).toBe(true)
    expect(row('start').cells.map((c) => c.bad)).toEqual([false, true])
    expect(row('onsite').cells.map((c) => c.bad)).toEqual([false, true])
    expect(row('axis:0').cells.map((c) => c.text)).toEqual(['○', '—'])
    expect(rows.map((r) => r.key)).toEqual([
      'monthlyIncl', 'monthlyExcl', 'hourly', 'settlement', 'remote', 'onsite', 'start',
      'days', 'supplyChain', 'paymentSite', 'must', 'nice', 'axis:0', 'axis:1', 'axis:2',
    ])
  })

  it('閾値が無ければ何も赤くしない', () => {
    const rows = buildCompareRows([b], DEFAULT_THRESHOLDS, [])
    expect(rows.every((r) => r.cells.every((c) => !c.bad))).toBe(true)
  })
})
```

- [ ] **Step 8: `src/lib/compare.ts`**

```ts
import { REMOTE_LABEL, type RemoteType, type Route } from './enums'
import { baseHours, formatMan, hourlyExcl, toExcl } from './rate'

/** 判断基準。値は D1 の settings にだけ入る。ここは形と既定（全部 null=判定しない）だけ */
export type Thresholds = {
  minMonthlyIncl: number | null
  minHourlyExcl: number | null
  targetStart: string | null
  maxOnsitePerMonth: number | null
}
export const DEFAULT_THRESHOLDS: Thresholds = {
  minMonthlyIncl: null,
  minHourlyExcl: null,
  targetStart: null,
  maxOnsitePerMonth: null,
}

function numOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export function parseThresholds(raw: string | null): Thresholds {
  if (!raw) return DEFAULT_THRESHOLDS
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    if (typeof o !== 'object' || o === null) return DEFAULT_THRESHOLDS
    return {
      minMonthlyIncl: numOrNull(o.minMonthlyIncl),
      minHourlyExcl: numOrNull(o.minHourlyExcl),
      targetStart: typeof o.targetStart === 'string' && /^\d{4}-\d{2}$/.test(o.targetStart) ? o.targetStart : null,
      maxOnsitePerMonth: numOrNull(o.maxOnsitePerMonth),
    }
  } catch {
    return DEFAULT_THRESHOLDS
  }
}

export function parseAxes(raw: string | null): string[] {
  if (!raw) return []
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
  } catch {
    return []
  }
}

export type CompareCase = {
  id: string
  company: string
  title: string
  route: Route
  monthlyMaxIncl: number
  monthlyMinIncl: number | null
  settlementMinH: number | null
  settlementMaxH: number | null
  remoteType: RemoteType
  onsiteNote: string | null
  startDate: string
  daysPerWeek: string | null
  supplyChain: string | null
  paymentSiteDays: number | null
  mustSkills: string[]
  niceSkills: string[]
  fitScores: number[] | null
}

export type CompareCell = { caseId: string; text: string; bad: boolean }
export type CompareRow = { key: string; label: string; cells: CompareCell[] }

/** full=0、onsite=∞、partial は「月N回」を読めた時だけ N。読めなければ null（判定しない） */
export function onsitePerMonth(remoteType: RemoteType, onsiteNote: string | null): number | null {
  if (remoteType === 'full') return 0
  if (remoteType === 'onsite') return Number.POSITIVE_INFINITY
  const m = onsiteNote?.match(/月\s*(\d+)\s*回/)
  return m ? Number(m[1]) : null
}

export function fitMark(score: number | null | undefined): string {
  if (score === 2) return '○'
  if (score === 1) return '△'
  if (score === 0) return '×'
  return '—'
}

const dash = (v: string | number | null | undefined) => (v === null || v === undefined ? '—' : String(v))

export function buildCompareRows(
  cases: CompareCase[],
  t: Thresholds,
  axes: string[],
): CompareRow[] {
  const row = (key: string, label: string, cell: (c: CompareCase) => CompareCell): CompareRow => ({
    key,
    label,
    cells: cases.map(cell),
  })
  const rows: CompareRow[] = [
    row('monthlyIncl', '税込（上限）', (c) => ({
      caseId: c.id,
      text: c.monthlyMinIncl ? `${formatMan(c.monthlyMinIncl)}〜${formatMan(c.monthlyMaxIncl)}` : formatMan(c.monthlyMaxIncl),
      bad: t.minMonthlyIncl !== null && c.monthlyMaxIncl < t.minMonthlyIncl,
    })),
    row('monthlyExcl', '税抜（上限）', (c) => ({
      caseId: c.id,
      text: formatMan(toExcl(c.monthlyMaxIncl)),
      bad: false,
    })),
    row('hourly', '時給（税抜）', (c) => {
      const { hours } = baseHours(c)
      const h = hourlyExcl(c.monthlyMaxIncl, hours)
      return {
        caseId: c.id,
        text: `${h.toLocaleString('ja-JP')}円 (÷${hours}h)`,
        bad: t.minHourlyExcl !== null && h < t.minHourlyExcl,
      }
    }),
    row('settlement', '精算幅', (c) => ({
      caseId: c.id,
      text: c.settlementMinH || c.settlementMaxH ? `${dash(c.settlementMinH)}〜${dash(c.settlementMaxH)}h` : '—',
      bad: false,
    })),
    row('remote', 'リモート', (c) => ({ caseId: c.id, text: REMOTE_LABEL[c.remoteType], bad: false })),
    row('onsite', '出社', (c) => {
      const n = onsitePerMonth(c.remoteType, c.onsiteNote)
      return {
        caseId: c.id,
        text: c.onsiteNote ?? (c.remoteType === 'full' ? 'なし' : '—'),
        bad: t.maxOnsitePerMonth !== null && n !== null && n > t.maxOnsitePerMonth,
      }
    }),
    row('start', '開始', (c) => ({
      caseId: c.id,
      text: c.startDate,
      bad: t.targetStart !== null && c.startDate.slice(0, 7) > t.targetStart,
    })),
    row('days', '稼働', (c) => ({ caseId: c.id, text: dash(c.daysPerWeek), bad: false })),
    row('supplyChain', '商流', (c) => ({ caseId: c.id, text: dash(c.supplyChain), bad: false })),
    row('paymentSite', '支払サイト', (c) => ({
      caseId: c.id,
      text: c.paymentSiteDays === null ? '—' : `${c.paymentSiteDays}日`,
      bad: false,
    })),
    row('must', '必須', (c) => ({ caseId: c.id, text: c.mustSkills.join('、') || '—', bad: false })),
    row('nice', '歓迎', (c) => ({ caseId: c.id, text: c.niceSkills.join('、') || '—', bad: false })),
  ]
  axes.forEach((axis, i) => {
    rows.push(row(`axis:${i}`, axis, (c) => ({ caseId: c.id, text: fitMark(c.fitScores?.[i]), bad: false })))
  })
  return rows
}
```

- [ ] **Step 9: 通過・カバレッジ 100%・コミット**

```bash
npx vitest run src/lib/compare.test.ts
npm run test:coverage && npm run typecheck && npm run format && npm run check:pii
git add -A
git commit -m "feat(lib): 期日・案件ログ・比較表の純粋関数

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: repository（cases / settings・実 D1 テスト）

**Files:**
- Create: `src/server/repository/cases.ts` `src/server/repository/cases.worker-test.ts` `src/server/repository/settings.ts` `src/server/repository/settings.worker-test.ts` `src/server/repository/index.ts` `src/server/repository.ts`
- Delete: `src/server/repository/schema.worker-test.ts`（内容を `cases.worker-test.ts` に吸収）

**Interfaces:**
- Consumes: `Db`（`db/client.ts`）／`cases` `caseLog` `settings` `type Case` `type CaseLogRow`（`db/schema.ts`）／`CaseRowValues`（`lib/caseInput.ts`）／`canTransition` `type CaseStatus`（`lib/status.ts`）／`parseThresholds` `parseAxes` `type Thresholds`（`lib/compare.ts`）
- Produces（`repository/cases.ts`）:
  - `listCases(db): Promise<Case[]>`（税込降順・企業名昇順）
  - `getCase(db, id): Promise<Case | null>`
  - `listLog(db, caseId): Promise<CaseLogRow[]>`
  - `insertCase(db, values: CaseRowValues, opts: { id?: string; importNote: string; at: string }): Promise<string>`（cases + case_log import）
  - `updateCase(db, id, values: Partial<CaseRowValues>): Promise<void>`
  - `changeStatus(db, id, to: CaseStatus, at: string): Promise<'ok' | 'not_found' | 'invalid_transition'>`
  - `setNextAction(db, id, v: { nextAction: string | null; nextActionDue: string | null }): Promise<void>`
  - `addMemo(db, caseId, body, at): Promise<string>`
  - `deleteLogEntry(db, id): Promise<void>`（kind=memo のみ）
  - `deleteCase(db, id): Promise<void>`
  - `findDuplicate(db, q: { sourceUrl: string | null; company: string; title: string }): Promise<Case | null>`
  - `recentLog(db, limit): Promise<(CaseLogRow & { company: string; title: string })[]>`
- Produces（`repository/settings.ts`）: `readSetting(db, key)` `writeSetting(db, key, value)` `readThresholds(db): Promise<Thresholds>` `readAxes(db): Promise<string[]>`

- [ ] **Step 1: `src/server/repository/cases.worker-test.ts`**

```ts
import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'

import { caseLog, cases } from '../../db/schema'
import type { CaseRowValues } from '../../lib/caseInput'
import {
  addMemo,
  changeStatus,
  deleteCase,
  deleteLogEntry,
  findDuplicate,
  getCase,
  insertCase,
  listCases,
  listLog,
  recentLog,
  setNextAction,
  updateCase,
} from './cases'
import { db, reset } from './test-helpers'

beforeEach(reset)

const values: CaseRowValues = {
  company: '甲社',
  title: 'テスト案件',
  route: 'findy',
  agentName: null,
  monthlyMaxIncl: 1_232_000,
  monthlyMinIncl: null,
  sourceTaxBasis: 'excl',
  settlementMinH: 140,
  settlementMaxH: 180,
  remoteType: 'full',
  onsiteNote: null,
  startDate: '2030-01',
  endDate: null,
  daysPerWeek: null,
  workLocation: null,
  supplyChain: null,
  paymentSiteDays: null,
  sourceUrl: 'https://example.com/jobs/1',
  mustSkills: ['TypeScript'],
  niceSkills: [],
  rawText: '原文',
  status: 'saved',
  nextAction: null,
  nextActionDue: null,
  fitScores: null,
  actualMonthlyIncl: null,
  note: null,
}
const AT = '2030-01-01T00:00:00+09:00'

describe('cases repository', () => {
  it('insert は case_log に import 行を作る。一覧は税込降順', async () => {
    const id = await insertCase(db, values, { importNote: 'add-case', at: AT })
    await insertCase(db, { ...values, company: '乙社', sourceUrl: null, monthlyMaxIncl: 2_000_000 }, { importNote: 'add-case', at: AT })
    const log = await listLog(db, id)
    expect(log).toHaveLength(1)
    expect(log[0].kind).toBe('import')
    const rows = await listCases(db)
    expect(rows.map((r) => r.company)).toEqual(['乙社', '甲社'])
    expect(rows[1].mustSkills).toEqual(['TypeScript'])
  })

  it('ステータス変更はルールを守り、ログを自動で残す', async () => {
    const id = await insertCase(db, values, { importNote: 't', at: AT })
    expect(await changeStatus(db, id, 'meeting', AT)).toBe('ok')
    expect(await changeStatus(db, id, 'applied', AT)).toBe('invalid_transition')
    expect(await changeStatus(db, 'missing', 'applied', AT)).toBe('not_found')
    const c = await getCase(db, id)
    expect(c?.status).toBe('meeting')
    const log = await listLog(db, id)
    const status = log.find((l) => l.kind === 'status')
    expect(status?.fromStatus).toBe('saved')
    expect(status?.toStatus).toBe('meeting')
  })

  it('updatedAt は datetime(now) の書式のまま', async () => {
    const id = await insertCase(db, values, { importNote: 't', at: AT })
    await updateCase(db, id, { note: 'メモ' })
    await setNextAction(db, id, { nextAction: '返信', nextActionDue: '2030-01-05' })
    const c = await getCase(db, id)
    expect(c?.note).toBe('メモ')
    expect(c?.nextActionDue).toBe('2030-01-05')
    expect(c?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  })

  it('メモの追加・削除。status 行は消せない', async () => {
    const id = await insertCase(db, values, { importNote: 't', at: AT })
    const memoId = await addMemo(db, id, '面談日程を待つ', AT)
    await changeStatus(db, id, 'applied', AT)
    const statusRow = (await listLog(db, id)).find((l) => l.kind === 'status')!
    await deleteLogEntry(db, statusRow.id)
    await deleteLogEntry(db, memoId)
    const kinds = (await listLog(db, id)).map((l) => l.kind).sort()
    expect(kinds).toEqual(['import', 'status'])
  })

  it('重複照会は sourceUrl か company+title', async () => {
    await insertCase(db, values, { importNote: 't', at: AT })
    expect(await findDuplicate(db, { sourceUrl: 'https://example.com/jobs/1', company: 'x', title: 'y' })).not.toBeNull()
    expect(await findDuplicate(db, { sourceUrl: null, company: '甲社', title: 'テスト案件' })).not.toBeNull()
    expect(await findDuplicate(db, { sourceUrl: null, company: '甲社', title: '別' })).toBeNull()
  })

  it('削除で case_log も消える。recentLog は企業名つき', async () => {
    const id = await insertCase(db, values, { importNote: 't', at: AT })
    const recent = await recentLog(db, 10)
    expect(recent[0].company).toBe('甲社')
    await deleteCase(db, id)
    expect(await db.select().from(cases).where(eq(cases.id, id))).toHaveLength(0)
    expect(await db.select().from(caseLog)).toHaveLength(0)
  })
})
```

- [ ] **Step 2: 失敗確認** — `npm run test:server` → FAIL（module not found）

- [ ] **Step 3: `src/server/repository/cases.ts`**

```ts
import { and, asc, desc, eq, or, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { caseLog, cases, type Case, type CaseLogRow } from '../../db/schema'
import type { CaseRowValues } from '../../lib/caseInput'
import { canTransition, type CaseStatus } from '../../lib/status'

export async function listCases(db: Db): Promise<Case[]> {
  return db.select().from(cases).orderBy(desc(cases.monthlyMaxIncl), asc(cases.company))
}

export async function getCase(db: Db, id: string): Promise<Case | null> {
  const [row] = await db.select().from(cases).where(eq(cases.id, id)).limit(1)
  return row ?? null
}

export async function listLog(db: Db, caseId: string): Promise<CaseLogRow[]> {
  return db.select().from(caseLog).where(eq(caseLog.caseId, caseId)).orderBy(desc(caseLog.at))
}

export async function insertCase(
  db: Db,
  values: CaseRowValues,
  opts: { id?: string; importNote: string; at: string },
): Promise<string> {
  const id = opts.id ?? crypto.randomUUID()
  await db.insert(cases).values({ ...values, id })
  await db.insert(caseLog).values({
    id: crypto.randomUUID(),
    caseId: id,
    at: opts.at,
    kind: 'import',
    body: opts.importNote,
  })
  return id
}

export async function updateCase(db: Db, id: string, values: Partial<CaseRowValues>): Promise<void> {
  await db
    .update(cases)
    .set({ ...values, updatedAt: sql`(datetime('now'))` })
    .where(eq(cases.id, id))
}

export async function changeStatus(
  db: Db,
  id: string,
  to: CaseStatus,
  at: string,
): Promise<'ok' | 'not_found' | 'invalid_transition'> {
  const current = await getCase(db, id)
  if (!current) return 'not_found'
  if (!canTransition(current.status, to)) return 'invalid_transition'
  await db
    .update(cases)
    .set({ status: to, updatedAt: sql`(datetime('now'))` })
    .where(eq(cases.id, id))
  await db.insert(caseLog).values({
    id: crypto.randomUUID(),
    caseId: id,
    at,
    kind: 'status',
    fromStatus: current.status,
    toStatus: to,
  })
  return 'ok'
}

export async function setNextAction(
  db: Db,
  id: string,
  v: { nextAction: string | null; nextActionDue: string | null },
): Promise<void> {
  await updateCase(db, id, v)
}

export async function addMemo(db: Db, caseId: string, body: string, at: string): Promise<string> {
  const id = crypto.randomUUID()
  await db.insert(caseLog).values({ id, caseId, at, kind: 'memo', body })
  return id
}

/** 自動記録（status / import）は経緯なので消さない。メモだけ消せる */
export async function deleteLogEntry(db: Db, id: string): Promise<void> {
  await db.delete(caseLog).where(and(eq(caseLog.id, id), eq(caseLog.kind, 'memo')))
}

export async function deleteCase(db: Db, id: string): Promise<void> {
  await db.delete(cases).where(eq(cases.id, id))
}

export async function findDuplicate(
  db: Db,
  q: { sourceUrl: string | null; company: string; title: string },
): Promise<Case | null> {
  const byPair = and(eq(cases.company, q.company), eq(cases.title, q.title))
  const where = q.sourceUrl ? or(eq(cases.sourceUrl, q.sourceUrl), byPair) : byPair
  const [row] = await db.select().from(cases).where(where).limit(1)
  return row ?? null
}

export async function recentLog(
  db: Db,
  limit: number,
): Promise<(CaseLogRow & { company: string; title: string })[]> {
  const rows = await db
    .select({
      id: caseLog.id,
      caseId: caseLog.caseId,
      at: caseLog.at,
      kind: caseLog.kind,
      fromStatus: caseLog.fromStatus,
      toStatus: caseLog.toStatus,
      body: caseLog.body,
      createdAt: caseLog.createdAt,
      company: cases.company,
      title: cases.title,
    })
    .from(caseLog)
    .innerJoin(cases, eq(caseLog.caseId, cases.id))
    .orderBy(desc(caseLog.at))
    .limit(limit)
  return rows
}
```

- [ ] **Step 4: `src/server/repository/settings.ts` とテスト**

```ts
import { eq, sql } from 'drizzle-orm'

import type { Db } from '../../db/client'
import { settings } from '../../db/schema'
import { parseAxes, parseThresholds, type Thresholds } from '../../lib/compare'

export async function readSetting(db: Db, key: string): Promise<string | null> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1)
  return row?.value ?? null
}

export async function writeSetting(db: Db, key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: sql`(datetime('now'))` } })
}

export async function readThresholds(db: Db): Promise<Thresholds> {
  return parseThresholds(await readSetting(db, 'thresholds'))
}

export async function readAxes(db: Db): Promise<string[]> {
  return parseAxes(await readSetting(db, 'axes'))
}
```

```ts
// src/server/repository/settings.worker-test.ts
import { beforeEach, describe, expect, it } from 'vitest'

import { readAxes, readThresholds, writeSetting } from './settings'
import { db, reset } from './test-helpers'

beforeEach(reset)

describe('settings', () => {
  it('thresholds / axes を JSON で往復し、壊れた値は既定にする', async () => {
    expect((await readThresholds(db)).minMonthlyIncl).toBeNull()
    await writeSetting(db, 'thresholds', JSON.stringify({ minMonthlyIncl: 1 }))
    expect((await readThresholds(db)).minMonthlyIncl).toBe(1)
    await writeSetting(db, 'thresholds', '{bad')
    expect((await readThresholds(db)).minMonthlyIncl).toBeNull()
    await writeSetting(db, 'axes', JSON.stringify(['軸1']))
    expect(await readAxes(db)).toEqual(['軸1'])
  })
})
```

`src/server/repository/index.ts` は `export * from './cases'` と `export * from './settings'`、`src/server/repository.ts` は `export * from './repository/index'`。`schema.worker-test.ts` の「source_url は重複を拒む」ケースを `cases.worker-test.ts` の末尾に移して元ファイルを消す。

- [ ] **Step 5: 検証とコミット**

```bash
npm run test:server && npm run typecheck && npm run format && npm run check:pii
git add -A
git commit -m "feat(server): cases / settings の repository と実 D1 テスト

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: `add-case` スクリプト・SQL 生成・check-pii・AGENTS.md の契約

**Files:**
- Create: `scripts/lib/caseSql.ts` `scripts/lib/caseSql.test.ts` `scripts/add-case.ts`
- Modify: `scripts/check-pii.mjs`（`*.local.json` を照合元に足す）、`AGENTS.md`（「案件票の登録」節）、`README.md`（使い方）

**Interfaces:**
- Consumes: `parseCaseJson` `toCaseRow` `type CaseRowValues`（`src/lib/caseInput.ts`）
- Produces（`scripts/lib/caseSql.ts`）: `sqlLiteral(v: unknown): string`／`caseColumns(row: CaseRowValues): Record<string, unknown>`（camel→snake・配列は JSON）／`insertCaseStatements(p: { id: string; row: CaseRowValues; at: string; importNote: string; logId: string; orReplace?: boolean }): string[]`／`updateCaseStatement(id: string, row: CaseRowValues): string`／`duplicateQuery(q: { sourceUrl: string | null; company: string; title: string }): string`／`slugToId(slug: string): string`
- Produces: `npm run add-case -- --file=<json> (--remote|--local) [--dry-run] [--update=<id>]`

- [ ] **Step 1: `scripts/lib/caseSql.test.ts`**（`node --test`。assert は `node:assert/strict`）

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  caseColumns,
  duplicateQuery,
  insertCaseStatements,
  slugToId,
  sqlLiteral,
  updateCaseStatement,
} from './caseSql.ts'
import type { CaseRowValues } from '../../src/lib/caseInput.ts'

const row: CaseRowValues = {
  company: "甲社 O'Reilly",
  title: 'テスト案件',
  route: 'findy',
  agentName: null,
  monthlyMaxIncl: 1_232_000,
  monthlyMinIncl: null,
  sourceTaxBasis: 'excl',
  settlementMinH: 140,
  settlementMaxH: 180,
  remoteType: 'full',
  onsiteNote: null,
  startDate: '2030-01',
  endDate: null,
  daysPerWeek: null,
  workLocation: null,
  supplyChain: null,
  paymentSiteDays: null,
  sourceUrl: null,
  mustSkills: ['TypeScript'],
  niceSkills: [],
  rawText: '原文\n2行目',
  status: 'saved',
  nextAction: null,
  nextActionDue: null,
  fitScores: null,
  actualMonthlyIncl: null,
  note: null,
}

describe('sqlLiteral', () => {
  it('NULL・数値・文字列のエスケープ', () => {
    assert.equal(sqlLiteral(null), 'NULL')
    assert.equal(sqlLiteral(12), '12')
    assert.equal(sqlLiteral("O'Reilly"), "'O''Reilly'")
  })
})

describe('caseColumns', () => {
  it('snake_case の列名になり、配列は JSON 文字列', () => {
    const cols = caseColumns(row)
    assert.equal(cols.monthly_max_incl, 1_232_000)
    assert.equal(cols.source_tax_basis, 'excl')
    assert.equal(cols.must_skills, '["TypeScript"]')
    assert.equal(cols.fit_scores, null)
    assert.ok(!('monthlyMaxIncl' in cols))
  })
})

describe('insertCaseStatements', () => {
  it('cases と case_log の 2 文。OR REPLACE は指定時だけ', () => {
    const [c, l] = insertCaseStatements({ id: 'id-1', row, at: '2030-01-01T00:00:00+09:00', importNote: 'add-case', logId: 'log-1' })
    assert.match(c, /^INSERT INTO cases \(/)
    assert.match(c, /'甲社 O''Reilly'/)
    assert.match(l, /^INSERT INTO case_log .* 'import'/)
    const [r] = insertCaseStatements({ id: 'id-1', row, at: 'x', importNote: 'h', logId: 'l', orReplace: true })
    assert.match(r, /^INSERT OR REPLACE INTO cases/)
  })
})

describe('updateCaseStatement / duplicateQuery / slugToId', () => {
  it('UPDATE は updated_at を datetime(now) にする', () => {
    const s = updateCaseStatement('id-1', row)
    assert.match(s, /^UPDATE cases SET /)
    assert.match(s, /updated_at = \(datetime\('now'\)\)/)
    assert.match(s, /WHERE id = 'id-1';$/)
  })
  it('重複照会は sourceUrl があれば OR、無ければ AND だけ', () => {
    assert.match(duplicateQuery({ sourceUrl: 'https://e.com', company: 'a', title: 'b' }), /source_url = 'https:\/\/e.com' OR/)
    assert.doesNotMatch(duplicateQuery({ sourceUrl: null, company: 'a', title: 'b' }), /source_url/)
  })
  it('slug から決定的な UUID 形', () => {
    assert.equal(slugToId('a'), slugToId('a'))
    assert.match(slugToId('a'), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})
```

- [ ] **Step 2: 失敗確認** — `npm run test:scripts` → FAIL

- [ ] **Step 3: `scripts/lib/caseSql.ts`**

```ts
/**
 * 案件行を D1 の SQL 文へ変換する純粋な部分。I/O はここに書かない。
 * add-case（INSERT / UPDATE）と import-history（INSERT OR REPLACE）が共有する。
 */
import { createHash } from 'node:crypto'

import type { CaseRowValues } from '../../src/lib/caseInput.ts'

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'number') return String(value)
  return `'${String(value).replaceAll("'", "''")}'`
}

/** camelCase → snake_case（schema.ts の列名と一致させる） */
function snake(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

const JSON_COLUMNS = new Set(['mustSkills', 'niceSkills', 'fitScores'])

export function caseColumns(row: CaseRowValues): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    out[snake(k)] = JSON_COLUMNS.has(k) ? (v === null ? null : JSON.stringify(v)) : v
  }
  return out
}

function insertInto(table: string, cols: Record<string, unknown>, orReplace: boolean): string {
  const names = Object.keys(cols)
  const values = names.map((n) => sqlLiteral(cols[n]))
  return `INSERT ${orReplace ? 'OR REPLACE ' : ''}INTO ${table} (${names.join(', ')}) VALUES (${values.join(', ')});`
}

export function insertCaseStatements(p: {
  id: string
  row: CaseRowValues
  at: string
  importNote: string
  logId: string
  orReplace?: boolean
}): string[] {
  const orReplace = p.orReplace ?? false
  return [
    insertInto('cases', { id: p.id, ...caseColumns(p.row) }, orReplace),
    insertInto(
      'case_log',
      { id: p.logId, case_id: p.id, at: p.at, kind: 'import', body: p.importNote },
      orReplace,
    ),
  ]
}

export function updateCaseStatement(id: string, row: CaseRowValues): string {
  const cols = caseColumns(row)
  const sets = Object.keys(cols).map((n) => `${n} = ${sqlLiteral(cols[n])}`)
  sets.push("updated_at = (datetime('now'))")
  return `UPDATE cases SET ${sets.join(', ')} WHERE id = ${sqlLiteral(id)};`
}

export function duplicateQuery(q: { sourceUrl: string | null; company: string; title: string }): string {
  const pair = `(company = ${sqlLiteral(q.company)} AND title = ${sqlLiteral(q.title)})`
  const where = q.sourceUrl ? `source_url = ${sqlLiteral(q.sourceUrl)} OR ${pair}` : pair
  return `SELECT id, company, title, status FROM cases WHERE ${where} LIMIT 5;`
}

/** slug から決定的に UUID 形の id を作る（import-history の冪等性） */
export function slugToId(slug: string): string {
  const hex = createHash('sha256').update(`freelance-pipeline:${slug}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}
```

- [ ] **Step 4: 通過確認** — `rm scripts/lib/smoke.test.ts`（Task 1 の仮テスト）→ `npm run test:scripts` → PASS

- [ ] **Step 5: `scripts/add-case.ts`**

```ts
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
import { duplicateQuery, insertCaseStatements, updateCaseStatement } from './lib/caseSql.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DATABASE = 'freelance-pipeline'
const LOCAL_LEDGER = resolve(root, 'cases.local.json')

function arg(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : null
}
const file = arg('file')
const target = process.argv.includes('--remote') ? 'remote' : process.argv.includes('--local') ? 'local' : null
const dryRun = process.argv.includes('--dry-run')
const updateId = arg('update')

if (!file || !target) {
  console.error('使い方: npm run add-case -- --file=<json> --remote|--local [--dry-run] [--update=<id>]')
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
  const dup = query(duplicateQuery({ sourceUrl: row.sourceUrl, company: row.company, title: row.title }))
  if (dup.length > 0) {
    console.error(`同じ案件が既にあります（${dup.length} 件）。上書きするなら --update=<id> を付けてください:`)
    for (const d of dup) console.error(`  id=${d.id} status=${d.status}`)
    process.exit(1)
  }
}

const id = updateId ?? crypto.randomUUID()
const statements = updateId
  ? [updateCaseStatement(updateId, row)]
  : insertCaseStatements({ id, row, at, importNote: 'add-case', logId: crypto.randomUUID() })

if (dryRun) {
  console.log(`dry-run: ${statements.length} 文（${updateId ? 'UPDATE' : 'INSERT'}）。税込上限=${row.monthlyMaxIncl}`)
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
const ledger: Array<{ company: string; title: string; agentName: string | null }> = existsSync(LOCAL_LEDGER)
  ? (JSON.parse(readFileSync(LOCAL_LEDGER, 'utf8')) as typeof ledger)
  : []
ledger.push({ company: row.company, title: row.title, agentName: row.agentName })
writeFileSync(LOCAL_LEDGER, JSON.stringify(ledger, null, 2))

console.log(`${updateId ? '更新' : '登録'}しました: id=${id}`)
console.log(`  /cases/${id}`)
```

- [ ] **Step 6: `scripts/check-pii.mjs` に `*.local.json` の照合を足す**

`.dev.vars` の読み取り部の直後に追記する（`secrets` に足す）:

```js
/**
 * 実データの台帳（gitignore 済み）からも語を拾う。
 *   cases.local.json   … add-case が書く { company, title, agentName }[]
 *   history.local.json … 過去案件 { cases: [{ company, title, agentName, ... }] }
 * 企業名は「株式会社」等を外した中核（3 文字以上）でも照合する（略称に効かせる）。
 */
const CORP_WORDS = /(株式会社|有限会社|合同会社|合資会社|一般社団法人|\(株\)|\(有\)|（株）|（有）|Inc\.?|Corp\.?|Co\.,? ?Ltd\.?|LLC)/g
function addName(value) {
  if (typeof value !== 'string') return
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
```

`if (!existsSync(devVarsPath))` の早期 `exit(0)` は `.dev.vars` が無くても `*.local.json` は見られるよう、`vars` を空オブジェクトにして続行する形に変える（`const vars = existsSync(devVarsPath) ? Object.fromEntries(...) : {}`）。`MEMBERS` の行は消す。架空値（`甲社` `乙社` `テスト案件`）は除外リストに入れる: `if (['甲社','乙社','テスト案件'].includes(v)) return` を `addName` の先頭に。

- [ ] **Step 7: `AGENTS.md` に「案件票の登録」節、`README.md` に使い方を追記**

`AGENTS.md` の「設計の約束」の後に:

````markdown
## 案件票の登録（Claude Code から）

「この案件票を登録して」＋ペースト、で次を行う。

1. 案件票を読み、`src/lib/caseInput.ts` の `caseInputSchema` に合う JSON を **scratchpad**（リポジトリ外）に書く。
   例は `CASE_JSON_EXAMPLE`（同ファイル）。金額は **案件票の表示のまま** 入れ、`taxBasis` で
   `incl`（税込表示）/ `excl`（税抜表示）を宣言する。×1.1 は自分で計算しない
2. `rawText` には案件票の原文をそのまま入れる（要約しない）
3. `npm run add-case -- --file=<json> --remote --dry-run` → 検証が通ったら `--dry-run` を外して実行
4. 「同じ案件が既にあります」と出たら、表示された id を確認し、上書きなら `--update=<id>`
5. 結果の URL を伝える。JSON と原文は会話に貼り直さない

税抜/税込の取り違えが実害になったことがある。`taxBasis` を必ず案件票の表記から決める。
````

`README.md` の「よく使うコマンド」の下に:

````markdown
## 案件票の登録

構造化は Claude Code 側で行う（AGENTS.md「案件票の登録」）。手で入れる場合は同じ JSON を
アプリの「取込」画面に貼る。JSON の形は `src/lib/caseInput.ts` の `CASE_JSON_EXAMPLE`。

```bash
npm run add-case -- --file=/path/to/case.json --remote --dry-run   # 検証だけ
npm run add-case -- --file=/path/to/case.json --remote             # 登録
npm run add-case -- --file=/path/to/case.json --remote --update=<id>
```
````

- [ ] **Step 8: ローカル D1 で通しの確認**

```bash
cat > /tmp/case-sample.json <<'EOF'
{"company":"甲社","title":"テスト案件","route":"findy","monthlyMax":1120000,"taxBasis":"excl","remoteType":"full","startDate":"2030-01","rawText":"原文","sourceUrl":"https://example.com/jobs/1"}
EOF
npm run add-case -- --file=/tmp/case-sample.json --local --dry-run
npm run add-case -- --file=/tmp/case-sample.json --local
npm run add-case -- --file=/tmp/case-sample.json --local          # 「同じ案件が既にあります」で exit 1
npx wrangler d1 execute freelance-pipeline --local --command "SELECT company, monthly_max_incl, source_tax_basis FROM cases"   # 1232000 / excl
npx wrangler d1 execute freelance-pipeline --local --command "SELECT kind, body FROM case_log"   # import / add-case
rm /tmp/case-sample.json cases.local.json
```

- [ ] **Step 9: 検証とコミット**

```bash
npm run test:scripts && npm run typecheck && npm run format && npm run check:pii
git add -A
git commit -m "feat(scripts): add-case（zod 検証→重複照会→wrangler d1 execute）と check-pii の *.local.json 対応

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: server function と一覧（/cases）

**Files:**
- Create: `src/server/cases.schema.ts` `src/server/cases.schema.test.ts` `src/server/cases.ts` `src/server/zod.ts` `src/components/cases/StatusBadge.tsx` `src/components/cases/CaseCard.tsx` `src/components/cases/CaseTable.tsx` `src/routes/cases.tsx`
- Modify: `src/lib/nav.ts`（Task 1 で済み）

**Interfaces:**
- Consumes: repository（Task 5）／`baseHours` `hourlyExcl` `toExcl` `formatMan`（`rate.ts`）／`statusGroup` `STATUS_GROUPS` `STATUS_GROUP_LABEL` `STATUS_LABEL` `STATUS_COLOR`（`status.ts`）／`ROUTE_LABEL` `REMOTE_LABEL`（`enums.ts`）／`formatJst`（`jst.ts`）／`caseInputSchema` `toCaseRow` `parseCaseJson`（`caseInput.ts`）／`canTransition` `isTerminal`
- Produces（`cases.schema.ts`）: `idInput`／`caseSaveInput = z.object({ id: idField.nullable(), values: caseInputSchema })`／`statusChangeInput = z.object({ id, to: z.enum(CASE_STATUSES) })`／`nextActionInput = z.object({ id, nextAction: nullableText(200), nextActionDue: dateField.nullable() })`／`memoInput = z.object({ id, body: z.string().trim().min(1).max(4000), date: dateField })`／`importInput = z.object({ json: z.string().max(200_000) })`
- Produces（`cases.ts`）: `type CaseListItem = Case & { monthlyExcl: number; hourly: number; hours: number; group: StatusGroup }`／`listCasesFn(): Promise<{ cases: CaseListItem[]; today: string }>`／`getCaseDetail({ id })`／`saveCase({ id, values })`／`changeCaseStatus({ id, to }): Promise<{ ok: boolean; reason?: string }>`／`saveNextAction`／`addCaseMemo`／`deleteCaseMemo`／`deleteCaseFn`／`importCase({ json }): Promise<{ ok: true; id } | { ok: false; issues } | { ok: false; duplicate: { id; company; title } }>`／`todayJst(): string`（server 内ヘルパ・export しない）
- Produces（components）: `StatusBadge({ status })`／`CaseCard({ item, today })`／`CaseTable({ items, today })`

- [ ] **Step 1: `src/server/zod.ts`（sumai-log から必要分だけ）と `src/server/cases.schema.ts`**

```ts
// src/server/zod.ts
import { z } from 'zod'

import { UUID_SHAPE } from '../lib/ids'

export const idField = z.string().regex(UUID_SHAPE, 'id の形式が不正です')
export const idInput = z.object({ id: idField })
export const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日付は YYYY-MM-DD')
export const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v))
    .nullable()
```

```ts
// src/server/cases.schema.ts
import { z } from 'zod'

import { caseInputSchema } from '../lib/caseInput'
import { CASE_STATUSES } from '../lib/status'
import { dateField, idField, nullableText } from './zod'

/** createServerFn のラッパーから切り離した zod（素の workers テストから直テストするため） */
export const caseSaveInput = z.object({ id: idField.nullable(), values: caseInputSchema })
export const statusChangeInput = z.object({ id: idField, to: z.enum(CASE_STATUSES) })
export const nextActionInput = z.object({
  id: idField,
  nextAction: nullableText(200),
  nextActionDue: dateField.nullable(),
})
export const memoInput = z.object({
  id: idField,
  body: z.string().trim().min(1, 'メモを入れてください').max(4000),
  date: dateField,
})
export const importInput = z.object({ json: z.string().max(200_000) })
```

```ts
// src/server/cases.schema.test.ts（vitest・node）
import { describe, expect, it } from 'vitest'

import { memoInput, nextActionInput, statusChangeInput } from './cases.schema'

const id = '11111111-1111-1111-1111-111111111111'

describe('cases.schema', () => {
  it('ステータスは既知の値のみ', () => {
    expect(statusChangeInput.safeParse({ id, to: 'meeting' }).success).toBe(true)
    expect(statusChangeInput.safeParse({ id, to: 'nope' }).success).toBe(false)
  })
  it('次の一手は空→null、期日は YYYY-MM-DD か null', () => {
    const r = nextActionInput.parse({ id, nextAction: '  ', nextActionDue: null })
    expect(r.nextAction).toBeNull()
    expect(nextActionInput.safeParse({ id, nextAction: 'x', nextActionDue: '2030-1-1' }).success).toBe(false)
  })
  it('メモは本文必須', () => {
    expect(memoInput.safeParse({ id, body: '', date: '2030-01-01' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: `src/server/cases.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import type { Case } from '../db/schema'
import { parseCaseJson, toCaseRow } from '../lib/caseInput'
import { memoAt } from '../lib/caseLog'
import { formatJst } from '../lib/jst'
import { baseHours, hourlyExcl, toExcl } from '../lib/rate'
import { statusGroup, type StatusGroup } from '../lib/status'
import {
  addMemo,
  changeStatus,
  deleteCase,
  deleteLogEntry,
  findDuplicate,
  getCase,
  insertCase,
  listCases,
  listLog,
  setNextAction,
  updateCase,
} from './repository'
import { caseSaveInput, importInput, memoInput, nextActionInput, statusChangeInput } from './cases.schema'
import { idInput } from './zod'

export type CaseListItem = Case & {
  monthlyExcl: number
  hourly: number
  hours: number
  group: StatusGroup
}

function todayJst(): string {
  return formatJst(new Date().toISOString(), { withTime: false })
}

export function decorate(c: Case): CaseListItem {
  const { hours } = baseHours(c)
  return {
    ...c,
    monthlyExcl: toExcl(c.monthlyMaxIncl),
    hourly: hourlyExcl(c.monthlyMaxIncl, hours),
    hours,
    group: statusGroup(c.status),
  }
}

export const listCasesFn = createServerFn().handler(async () => {
  const rows = await listCases(getDb())
  return { cases: rows.map(decorate), today: todayJst() }
})

export const getCaseDetail = createServerFn()
  .validator(idInput)
  .handler(async ({ data }) => {
    const db = getDb()
    const c = await getCase(db, data.id)
    if (!c) throw new Response('Not Found', { status: 404 })
    const log = await listLog(db, data.id)
    return { item: decorate(c), log, today: todayJst() }
  })

export const saveCase = createServerFn({ method: 'POST' })
  .validator(caseSaveInput)
  .handler(async ({ data }) => {
    const db = getDb()
    const row = toCaseRow(data.values)
    if (data.id) {
      const existing = await getCase(db, data.id)
      if (!existing) throw new Response('Not Found', { status: 404 })
      // 税基準は取込時の記録。編集フォームは税込で入れるので上書きしない。
      // ステータスは StatusChanger だけが変える（ログを残すため）
      await updateCase(db, data.id, {
        ...row,
        status: existing.status,
        sourceTaxBasis: existing.sourceTaxBasis,
      })
      return { id: data.id }
    }
    const id = await insertCase(db, row, { importNote: 'フォーム', at: new Date().toISOString() })
    return { id }
  })

export const changeCaseStatus = createServerFn({ method: 'POST' })
  .validator(statusChangeInput)
  .handler(async ({ data }) => {
    const result = await changeStatus(getDb(), data.id, data.to, new Date().toISOString())
    return result === 'ok' ? { ok: true as const } : { ok: false as const, reason: result }
  })

export const saveNextAction = createServerFn({ method: 'POST' })
  .validator(nextActionInput)
  .handler(async ({ data }) => {
    await setNextAction(getDb(), data.id, { nextAction: data.nextAction, nextActionDue: data.nextActionDue })
    return { ok: true as const }
  })

export const addCaseMemo = createServerFn({ method: 'POST' })
  .validator(memoInput)
  .handler(async ({ data }) => ({ id: await addMemo(getDb(), data.id, data.body, memoAt(data.date)) }))

export const deleteCaseMemo = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await deleteLogEntry(getDb(), data.id)
    return { ok: true as const }
  })

export const deleteCaseFn = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await deleteCase(getDb(), data.id)
    return { ok: true as const }
  })

export const importCase = createServerFn({ method: 'POST' })
  .validator(importInput)
  .handler(async ({ data }) => {
    const parsed = parseCaseJson(data.json)
    if (!parsed.ok) return { ok: false as const, issues: parsed.issues }
    const db = getDb()
    const row = toCaseRow(parsed.input)
    const dup = await findDuplicate(db, { sourceUrl: row.sourceUrl, company: row.company, title: row.title })
    if (dup) return { ok: false as const, duplicate: { id: dup.id, company: dup.company, title: dup.title } }
    const id = await insertCase(db, row, { importNote: '取込フォーム', at: new Date().toISOString() })
    return { ok: true as const, id }
  })
```

`decorate` はルートから直接 import しない（server の非 serverFn を route が import するとクライアントバンドルに漏れる）。ルートは `listCasesFn` の戻り値だけを使う。

- [ ] **Step 3: `StatusBadge` / `CaseCard` / `CaseTable`**

```tsx
// src/components/cases/StatusBadge.tsx
import { Badge } from '@mantine/core'

import { STATUS_COLOR, STATUS_LABEL, isTerminal, type CaseStatus } from '../../lib/status'

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge color={STATUS_COLOR[status]} variant={isTerminal(status) ? 'outline' : 'light'}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
```

```tsx
// src/components/cases/CaseCard.tsx（スマホ）
import { Badge, Card, Group, Stack, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { dueState } from '../../lib/deadlines'
import { REMOTE_LABEL, ROUTE_LABEL } from '../../lib/enums'
import { formatMan } from '../../lib/rate'
import type { CaseListItem } from '../../server/cases'
import { StatusBadge } from './StatusBadge'

const DUE_COLOR = { overdue: 'red', today: 'orange', soon: 'yellow', later: 'gray' } as const

export function CaseCard({ item, today }: { item: CaseListItem; today: string }) {
  return (
    <Link to="/cases/$id" params={{ id: item.id }} style={{ textDecoration: 'none' }}>
      <Card withBorder padding="sm">
        <Stack gap={6}>
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Text fw={700} lineClamp={2}>
                {item.title}
              </Text>
              <Text size="sm" c="dimmed" lineClamp={1}>
                {item.company}・{ROUTE_LABEL[item.route]}
              </Text>
            </Stack>
            <StatusBadge status={item.status} />
          </Group>
          <Group gap="xs">
            <Text fw={700}>{formatMan(item.monthlyMaxIncl)}</Text>
            <Text size="sm" c="dimmed">
              税込 / 税抜 {formatMan(item.monthlyExcl)} / {item.hourly.toLocaleString('ja-JP')}円 (÷{item.hours}h)
            </Text>
          </Group>
          <Group gap="xs">
            <Badge variant="default">{REMOTE_LABEL[item.remoteType]}</Badge>
            {item.onsiteNote ? <Badge variant="default">{item.onsiteNote}</Badge> : null}
            <Badge variant="default">開始 {item.startDate}</Badge>
            {item.daysPerWeek ? <Badge variant="default">{item.daysPerWeek}</Badge> : null}
          </Group>
          {item.nextAction || item.nextActionDue ? (
            <Group gap="xs" wrap="nowrap">
              {item.nextActionDue ? (
                <Badge color={DUE_COLOR[dueState(item.nextActionDue, today)]} variant="light">
                  {item.nextActionDue}
                </Badge>
              ) : null}
              <Text size="sm" lineClamp={1}>
                {item.nextAction ?? ''}
              </Text>
            </Group>
          ) : null}
        </Stack>
      </Card>
    </Link>
  )
}
```

```tsx
// src/components/cases/CaseTable.tsx（PC）
import { Badge, Table, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { dueState } from '../../lib/deadlines'
import { REMOTE_LABEL, ROUTE_LABEL } from '../../lib/enums'
import { formatMan } from '../../lib/rate'
import type { CaseListItem } from '../../server/cases'
import { StatusBadge } from './StatusBadge'

const DUE_COLOR = { overdue: 'red', today: 'orange', soon: 'yellow', later: 'gray' } as const

export function CaseTable({ items, today }: { items: CaseListItem[]; today: string }) {
  return (
    <Table.ScrollContainer minWidth={900}>
      <Table striped highlightOnHover stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>案件</Table.Th>
            <Table.Th>経路</Table.Th>
            <Table.Th ta="right">税抜</Table.Th>
            <Table.Th ta="right">税込</Table.Th>
            <Table.Th ta="right">時給</Table.Th>
            <Table.Th>リモート</Table.Th>
            <Table.Th>開始</Table.Th>
            <Table.Th>状態</Table.Th>
            <Table.Th>次の一手</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((c) => (
            <Table.Tr key={c.id}>
              <Table.Td>
                <Link to="/cases/$id" params={{ id: c.id }}>
                  <Text fw={600} lineClamp={1}>
                    {c.title}
                  </Text>
                </Link>
                <Text size="xs" c="dimmed">
                  {c.company}
                </Text>
              </Table.Td>
              <Table.Td>{ROUTE_LABEL[c.route]}</Table.Td>
              <Table.Td ta="right">{formatMan(c.monthlyExcl)}</Table.Td>
              <Table.Td ta="right">
                <Text fw={700}>{formatMan(c.monthlyMaxIncl)}</Text>
              </Table.Td>
              <Table.Td ta="right">
                {c.hourly.toLocaleString('ja-JP')}円
                <Text size="xs" c="dimmed" span>
                  {' '}
                  ÷{c.hours}h
                </Text>
              </Table.Td>
              <Table.Td>
                {REMOTE_LABEL[c.remoteType]}
                {c.onsiteNote ? (
                  <Text size="xs" c="dimmed">
                    {c.onsiteNote}
                  </Text>
                ) : null}
              </Table.Td>
              <Table.Td>{c.startDate}</Table.Td>
              <Table.Td>
                <StatusBadge status={c.status} />
              </Table.Td>
              <Table.Td>
                {c.nextActionDue ? (
                  <Badge color={DUE_COLOR[dueState(c.nextActionDue, today)]} variant="light" mr={4}>
                    {c.nextActionDue}
                  </Badge>
                ) : null}
                <Text size="sm" span>
                  {c.nextAction ?? ''}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
```

- [ ] **Step 4: `src/routes/cases.tsx`**

```tsx
import { Box, Chip, Group, Stack, Text } from '@mantine/core'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { CaseCard } from '../components/cases/CaseCard'
import { CaseTable } from '../components/cases/CaseTable'
import { EmptyState } from '../components/EmptyState'
import { Fab } from '../components/Fab'
import { PageShell } from '../components/PageShell'
import { formatMan, median } from '../lib/rate'
import { STATUS_GROUPS, STATUS_GROUP_LABEL, type StatusGroup } from '../lib/status'
import { listCasesFn } from '../server/cases'

const search = z.object({ group: z.enum(STATUS_GROUPS).default('active') })

export const Route = createFileRoute('/cases')({
  component: Page,
  validateSearch: (s) => search.parse(s),
  loader: () => listCasesFn(),
})

function Page() {
  const { cases, today } = Route.useLoaderData()
  const { group } = Route.useSearch()
  const navigate = useNavigate({ from: '/cases' })
  const items = cases.filter((c) => c.group === group)
  const counts = Object.fromEntries(STATUS_GROUPS.map((g) => [g, cases.filter((c) => c.group === g).length]))
  const med = median(items.map((c) => c.monthlyMaxIncl))

  return (
    <PageShell
      title="案件"
      description={
        group === 'active' && items.length > 0
          ? `進行中 ${items.length} 本・税込中央値 ${formatMan(med)}`
          : undefined
      }
      fab
    >
      <Stack gap="md">
        <Chip.Group value={group} onChange={(v) => navigate({ search: { group: v as StatusGroup }, replace: true })}>
          <Group gap="xs">
            {STATUS_GROUPS.map((g) => (
              <Chip key={g} value={g}>
                {STATUS_GROUP_LABEL[g]} {counts[g]}
              </Chip>
            ))}
          </Group>
        </Chip.Group>
        {items.length === 0 ? (
          <EmptyState emoji="📭" title="この区分の案件はありません" description="右下の取込から登録できます。" />
        ) : (
          <>
            <Box hiddenFrom="md">
              <Stack gap="sm">
                {items.map((c) => (
                  <CaseCard key={c.id} item={c} today={today} />
                ))}
              </Stack>
            </Box>
            <Box visibleFrom="md">
              <CaseTable items={items} today={today} />
            </Box>
          </>
        )}
        <Text size="xs" c="dimmed">
          税込降順。時給は税抜 ÷ 基準時間（精算幅の中点か経路の既定）。
        </Text>
      </Stack>
      <Fab label="取込" onClick={() => navigate({ to: '/import' })} />
    </PageShell>
  )
}
```

`/import` ルートは Task 10 で作る。それまで `npm run typecheck` が `to: '/import'` で落ちるので、このタスクでは `src/routes/import.tsx` を仮置きする（Task 1 の `index.tsx` と同じ「準備中」の形・`createFileRoute('/import')`）。

- [ ] **Step 5: 動作確認・検証・コミット**

`npm run dev` をバックグラウンド起動 → Task 6 Step 8 の要領で架空の案件を 2 件 `--local` 投入 → `/cases` で 390×844（カード）と 1280（表）を Playwright MCP で確認 → チップで区分が切り替わる → dev を止め、投入した行は `npx wrangler d1 execute freelance-pipeline --local --command "DELETE FROM cases"` で消す。

```bash
npm run format:check && npm run typecheck && npm run test:coverage && npm run test:server && npm run build && npm run check:pii
git add -A
git commit -m "feat(cases): server function と一覧（カード/表・区分チップ・時給換算）

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: 詳細（/cases/$id）— 条件・ステータス変更・次の一手・ログ・原文・編集・削除

**Files:**
- Create: `src/components/cases/StatusChanger.tsx` `src/components/cases/NextActionEditor.tsx` `src/components/cases/CaseLogList.tsx` `src/components/cases/RawTextPanel.tsx` `src/components/cases/CaseForm.tsx` `src/routes/cases_.$id.tsx`

**Interfaces:**
- Consumes: `getCaseDetail` `saveCase` `changeCaseStatus` `saveNextAction` `addCaseMemo` `deleteCaseMemo` `deleteCaseFn`（`server/cases.ts`）／`describeLog` `formatLogAt` `sortLogNewestFirst`（`lib/caseLog.ts`）／`canTransition` `isTerminal` `CASE_STATUSES` `STATUS_LABEL`／`Row`（`components/DetailRow.tsx`）／`FormDrawer` `PageShell`／`extractErrorMessage`
- Produces: `StatusChanger({ id, status })`／`NextActionEditor({ id, nextAction, nextActionDue })`／`CaseLogList({ caseId, log, today })`／`RawTextPanel({ text })`／`CaseForm({ item, axes, onSaved })`

- [ ] **Step 1: `StatusChanger`**

```tsx
import { Button, Group, Select } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { CASE_STATUSES, STATUS_LABEL, canTransition, isTerminal, type CaseStatus } from '../../lib/status'
import { changeCaseStatus } from '../../server/cases'

export function StatusChanger({ id, status }: { id: string; status: CaseStatus }) {
  const router = useRouter()
  const change = useServerFn(changeCaseStatus)
  const [to, setTo] = useState<CaseStatus | null>(null)
  const [saving, setSaving] = useState(false)
  const options = CASE_STATUSES.filter((s) => canTransition(status, s)).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
  }))

  async function submit() {
    if (!to) return
    if (isTerminal(to) && !window.confirm(`「${STATUS_LABEL[to]}」にすると戻せません。よいですか？`)) return
    setSaving(true)
    try {
      const r = await change({ data: { id, to } })
      if (!r.ok) {
        notifications.show({ message: 'この遷移はできません', color: 'red' })
        return
      }
      setTo(null)
      await router.invalidate()
      notifications.show({ message: `${STATUS_LABEL[to]} にしました` })
    } catch {
      notifications.show({ message: '変更できませんでした', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  if (options.length === 0) return null
  return (
    <Group gap="xs" align="flex-end" wrap="nowrap">
      <Select
        label="ステータスを変更"
        placeholder="次の状態"
        data={options}
        value={to}
        onChange={(v) => setTo(v as CaseStatus | null)}
        style={{ flex: 1 }}
      />
      <Button onClick={submit} loading={saving} disabled={!to}>
        変更
      </Button>
    </Group>
  )
}
```

- [ ] **Step 2: `NextActionEditor`**

```tsx
import { Button, Group, Stack, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { extractErrorMessage } from '../../lib/formError'
import { saveNextAction } from '../../server/cases'

export function NextActionEditor({
  id,
  nextAction,
  nextActionDue,
}: {
  id: string
  nextAction: string | null
  nextActionDue: string | null
}) {
  const router = useRouter()
  const save = useServerFn(saveNextAction)
  const [saving, setSaving] = useState(false)
  // Mantine 9.6 の DateInput は値を 'YYYY-MM-DD' 文字列で扱う
  const form = useForm({ initialValues: { nextAction: nextAction ?? '', nextActionDue: nextActionDue ?? '' } })

  async function submit(v: { nextAction: string; nextActionDue: string }) {
    setSaving(true)
    try {
      await save({ data: { id, nextAction: v.nextAction, nextActionDue: v.nextActionDue || null } })
      await router.invalidate()
      notifications.show({ message: '次の一手を保存しました' })
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="xs">
        <TextInput label="次の一手" placeholder="例: 書類通過の連絡が来たら面談日程を返す" {...form.getInputProps('nextAction')} />
        <Group align="flex-end" gap="xs" wrap="nowrap">
          <DateInput
            label="期日"
            valueFormat="YYYY-MM-DD"
            clearable
            style={{ flex: 1 }}
            {...form.getInputProps('nextActionDue')}
            value={form.values.nextActionDue || null}
            onChange={(v) => form.setFieldValue('nextActionDue', v ?? '')}
          />
          <Button type="submit" loading={saving}>
            保存
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
```

- [ ] **Step 3: `CaseLogList`**

```tsx
import { ActionIcon, Button, Group, Stack, Text, Textarea, Timeline, Title } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { CaseLogRow } from '../../db/schema'
import { describeLog, formatLogAt, sortLogNewestFirst } from '../../lib/caseLog'
import { extractErrorMessage } from '../../lib/formError'
import { addCaseMemo, deleteCaseMemo } from '../../server/cases'

export function CaseLogList({ caseId, log, today }: { caseId: string; log: CaseLogRow[]; today: string }) {
  const router = useRouter()
  const add = useServerFn(addCaseMemo)
  const remove = useServerFn(deleteCaseMemo)
  const [body, setBody] = useState('')
  const [date, setDate] = useState<string>(today)
  const [saving, setSaving] = useState(false)
  const entries = sortLogNewestFirst(log)

  async function submit() {
    if (!body.trim()) return
    setSaving(true)
    try {
      await add({ data: { id: caseId, body, date } })
      setBody('')
      await router.invalidate()
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('このメモを削除します。')) return
    try {
      await remove({ data: { id } })
      await router.invalidate()
    } catch {
      notifications.show({ message: '削除できませんでした', color: 'red' })
    }
  }

  return (
    <Stack gap="sm">
      <Title order={2}>経緯</Title>
      <Timeline bulletSize={14} lineWidth={2}>
        {entries.map((e) => (
          <Timeline.Item
            key={e.id}
            title={formatLogAt(e)}
            color={e.kind === 'status' ? 'indigo' : e.kind === 'import' ? 'gray' : 'teal'}
          >
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} className="breakable">
                {describeLog(e)}
              </Text>
              {e.kind === 'memo' ? (
                <ActionIcon variant="subtle" color="red" aria-label="メモを削除" onClick={() => handleDelete(e.id)}>
                  <Trash2 size={16} />
                </ActionIcon>
              ) : null}
            </Group>
          </Timeline.Item>
        ))}
      </Timeline>
      <Group align="flex-end" gap="xs" wrap="nowrap">
        <DateInput label="日付" valueFormat="YYYY-MM-DD" value={date} onChange={(v) => setDate(v ?? today)} />
      </Group>
      <Textarea placeholder="例: 書類通過。面談日程の候補を返した" autosize minRows={2} value={body} onChange={(e) => setBody(e.currentTarget.value)} maxLength={4000} />
      <Button onClick={submit} loading={saving} disabled={!body.trim()} fullWidth>
        メモを追加
      </Button>
    </Stack>
  )
}
```

- [ ] **Step 4: `RawTextPanel` と `CaseForm`**

```tsx
// src/components/cases/RawTextPanel.tsx
import { Accordion, Text } from '@mantine/core'

export function RawTextPanel({ text }: { text: string }) {
  return (
    <Accordion variant="contained">
      <Accordion.Item value="raw">
        <Accordion.Control>原文（{text.length.toLocaleString('ja-JP')} 文字）</Accordion.Control>
        <Accordion.Panel>
          <Text className="rawtext">{text}</Text>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
```

```tsx
// src/components/cases/CaseForm.tsx
import { Button, Group, NumberInput, Select, Stack, TagsInput, TextInput, Textarea, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import type { Case } from '../../db/schema'
import { REMOTE_LABEL, REMOTE_TYPES, ROUTES, ROUTE_LABEL } from '../../lib/enums'
import { extractFormError } from '../../lib/formError'
import { saveCase } from '../../server/cases'

/** フォームは税込で入力する。NumberInput の空欄は '' で来るので送信時に null へ */
type Num = number | ''
type Values = {
  company: string
  title: string
  route: Case['route']
  agentName: string
  monthlyMax: Num
  monthlyMin: Num
  settlementMinH: Num
  settlementMaxH: Num
  remoteType: Case['remoteType']
  onsiteNote: string
  startDate: string
  endDate: string
  daysPerWeek: string
  workLocation: string
  supplyChain: string
  paymentSiteDays: Num
  sourceUrl: string
  mustSkills: string[]
  niceSkills: string[]
  rawText: string
  fitScores: Num[]
  actualMonthlyIncl: Num
  note: string
}

const n = (v: Num) => (v === '' ? null : v)
const s = (v: string) => v.trim() || null

export function CaseForm({ item, axes, onSaved }: { item: Case | null; axes: string[]; onSaved: (id: string) => void }) {
  const router = useRouter()
  const save = useServerFn(saveCase)
  const [saving, setSaving] = useState(false)
  const form = useForm<Values>({
    initialValues: {
      company: item?.company ?? '',
      title: item?.title ?? '',
      route: item?.route ?? 'findy',
      agentName: item?.agentName ?? '',
      monthlyMax: item?.monthlyMaxIncl ?? '',
      monthlyMin: item?.monthlyMinIncl ?? '',
      settlementMinH: item?.settlementMinH ?? '',
      settlementMaxH: item?.settlementMaxH ?? '',
      remoteType: item?.remoteType ?? 'full',
      onsiteNote: item?.onsiteNote ?? '',
      startDate: item?.startDate ?? '',
      endDate: item?.endDate ?? '',
      daysPerWeek: item?.daysPerWeek ?? '',
      workLocation: item?.workLocation ?? '',
      supplyChain: item?.supplyChain ?? '',
      paymentSiteDays: item?.paymentSiteDays ?? '',
      sourceUrl: item?.sourceUrl ?? '',
      mustSkills: item?.mustSkills ?? [],
      niceSkills: item?.niceSkills ?? [],
      rawText: item?.rawText ?? '',
      fitScores: axes.map((_, i) => item?.fitScores?.[i] ?? ''),
      actualMonthlyIncl: item?.actualMonthlyIncl ?? '',
      note: item?.note ?? '',
    },
    validate: {
      company: (v) => (v.trim() ? null : '企業名は必須です'),
      title: (v) => (v.trim() ? null : '案件名は必須です'),
      monthlyMax: (v) => (v === '' ? '単価上限は必須です' : null),
      startDate: (v) => (/^\d{4}-\d{2}(-\d{2})?$/.test(v) ? null : 'YYYY-MM-DD か YYYY-MM'),
      rawText: (v) => (v.trim() ? null : '原文は必須です'),
    },
  })

  async function submit(v: Values) {
    setSaving(true)
    try {
      const scores = v.fitScores.map(n)
      const { id } = await save({
        data: {
          id: item?.id ?? null,
          values: {
            company: v.company,
            title: v.title,
            route: v.route,
            agentName: s(v.agentName),
            monthlyMax: v.monthlyMax === '' ? 0 : v.monthlyMax,
            monthlyMin: n(v.monthlyMin),
            taxBasis: 'incl',
            settlementMinH: n(v.settlementMinH),
            settlementMaxH: n(v.settlementMaxH),
            remoteType: v.remoteType,
            onsiteNote: s(v.onsiteNote),
            startDate: v.startDate,
            endDate: s(v.endDate),
            daysPerWeek: s(v.daysPerWeek),
            workLocation: s(v.workLocation),
            supplyChain: s(v.supplyChain),
            paymentSiteDays: n(v.paymentSiteDays),
            sourceUrl: s(v.sourceUrl),
            mustSkills: v.mustSkills,
            niceSkills: v.niceSkills,
            rawText: v.rawText,
            status: item?.status ?? 'saved',
            nextAction: item?.nextAction ?? null,
            nextActionDue: item?.nextActionDue ?? null,
            fitScores: scores.every((x) => x === null) ? null : scores.map((x) => x ?? 0),
            actualMonthlyIncl: n(v.actualMonthlyIncl),
            note: s(v.note),
          },
        },
      })
      await router.invalidate()
      notifications.show({ message: item ? '更新しました' : '登録しました' })
      onSaved(id)
    } catch (e) {
      const { message, path } = extractFormError(e)
      if (path && path in form.values) form.setFieldError(path, message)
      else notifications.show({ message, color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.onSubmit(submit)}>
      <Stack gap="md">
        <TextInput label="企業名" required {...form.getInputProps('company')} />
        <TextInput label="案件名" required {...form.getInputProps('title')} />
        <Group grow>
          <Select label="経路" data={ROUTES.map((r) => ({ value: r, label: ROUTE_LABEL[r] }))} {...form.getInputProps('route')} />
          <TextInput label="担当エージェント" {...form.getInputProps('agentName')} />
        </Group>
        <Title order={3}>条件（金額は税込）</Title>
        <Group grow>
          <NumberInput label="単価上限（税込・円）" required min={1} thousandSeparator="," {...form.getInputProps('monthlyMax')} />
          <NumberInput label="単価下限（税込・円）" min={1} thousandSeparator="," {...form.getInputProps('monthlyMin')} />
        </Group>
        <Group grow>
          <NumberInput label="精算 下限（h）" min={1} max={400} {...form.getInputProps('settlementMinH')} />
          <NumberInput label="精算 上限（h）" min={1} max={400} {...form.getInputProps('settlementMaxH')} />
        </Group>
        <Group grow>
          <Select label="リモート" data={REMOTE_TYPES.map((r) => ({ value: r, label: REMOTE_LABEL[r] }))} {...form.getInputProps('remoteType')} />
          <TextInput label="出社の実態" placeholder="例: 月4回出社" {...form.getInputProps('onsiteNote')} />
        </Group>
        <Group grow>
          <TextInput label="開始（YYYY-MM-DD / YYYY-MM）" required {...form.getInputProps('startDate')} />
          <TextInput label="終了" {...form.getInputProps('endDate')} />
        </Group>
        <Group grow>
          <TextInput label="稼働" placeholder="例: 週4〜5" {...form.getInputProps('daysPerWeek')} />
          <TextInput label="作業場所" {...form.getInputProps('workLocation')} />
        </Group>
        <Group grow>
          <TextInput label="商流" {...form.getInputProps('supplyChain')} />
          <NumberInput label="支払サイト（日）" min={0} max={365} {...form.getInputProps('paymentSiteDays')} />
        </Group>
        <TextInput label="案件 URL" type="url" {...form.getInputProps('sourceUrl')} />
        <TagsInput label="必須スキル" splitChars={[',', '、']} {...form.getInputProps('mustSkills')} />
        <TagsInput label="歓迎スキル" splitChars={[',', '、']} {...form.getInputProps('niceSkills')} />
        {axes.length > 0 ? (
          <>
            <Title order={3}>軸（0〜2）</Title>
            <Group grow>
              {axes.map((axis, i) => (
                <NumberInput key={axis} label={axis} min={0} max={2} {...form.getInputProps(`fitScores.${i}`)} />
              ))}
            </Group>
          </>
        ) : null}
        <NumberInput label="実単価（税込・参画した案件）" min={1} thousandSeparator="," {...form.getInputProps('actualMonthlyIncl')} />
        <Textarea label="判断メモ" autosize minRows={2} {...form.getInputProps('note')} />
        <Textarea label="原文" required autosize minRows={6} maxRows={20} className="rawtext" {...form.getInputProps('rawText')} />
        <Button type="submit" loading={saving} fullWidth>
          保存
        </Button>
      </Stack>
    </form>
  )
}
```

- [ ] **Step 5: `src/routes/cases_.$id.tsx`**

```tsx
import { ActionIcon, Anchor, Badge, Card, Group, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Row } from '../components/DetailRow'
import { FormDrawer } from '../components/FormDrawer'
import { PageShell } from '../components/PageShell'
import { CaseForm } from '../components/cases/CaseForm'
import { CaseLogList } from '../components/cases/CaseLogList'
import { NextActionEditor } from '../components/cases/NextActionEditor'
import { RawTextPanel } from '../components/cases/RawTextPanel'
import { StatusBadge } from '../components/cases/StatusBadge'
import { StatusChanger } from '../components/cases/StatusChanger'
import { REMOTE_LABEL, ROUTE_LABEL, TAX_BASIS_LABEL } from '../lib/enums'
import { fitMark } from '../lib/compare'
import { formatMan } from '../lib/rate'
import { deleteCaseFn, getCaseDetail } from '../server/cases'
import { getSettingsData } from '../server/settings'

export const Route = createFileRoute('/cases_/$id')({
  component: Page,
  loader: async ({ params }) => {
    const [detail, settings] = await Promise.all([getCaseDetail({ data: { id: params.id } }), getSettingsData()])
    return { ...detail, axes: settings.axes }
  },
})

function Page() {
  const { item, log, today, axes } = Route.useLoaderData()
  const navigate = useNavigate()
  const remove = useServerFn(deleteCaseFn)
  const [editing, setEditing] = useState(false)

  async function handleDelete() {
    if (!window.confirm('この案件と経緯をすべて削除します。')) return
    try {
      await remove({ data: { id: item.id } })
      notifications.show({ message: '削除しました' })
      navigate({ to: '/cases', search: { group: 'active' } })
    } catch {
      notifications.show({ message: '削除できませんでした', color: 'red' })
    }
  }

  return (
    <PageShell
      title={item.title}
      description={`${item.company}・${ROUTE_LABEL[item.route]}${item.agentName ? `（${item.agentName}）` : ''}`}
      actions={
        <Group gap="xs">
          <StatusBadge status={item.status} />
          <ActionIcon variant="default" aria-label="編集" onClick={() => setEditing(true)}>
            <Pencil size={16} />
          </ActionIcon>
          <ActionIcon variant="default" color="red" aria-label="削除" onClick={handleDelete}>
            <Trash2 size={16} />
          </ActionIcon>
        </Group>
      }
    >
      <Card withBorder padding="md">
        <Stack gap="xs">
          <Row
            label="単価（税込）"
            value={`${item.monthlyMinIncl ? `${formatMan(item.monthlyMinIncl)}〜` : ''}${formatMan(item.monthlyMaxIncl)}（案件票は${TAX_BASIS_LABEL[item.sourceTaxBasis]}）`}
          />
          <Row label="税抜" value={formatMan(item.monthlyExcl)} />
          <Row label="時給（税抜）" value={`${item.hourly.toLocaleString('ja-JP')}円 ÷${item.hours}h`} />
          <Row label="精算幅" value={item.settlementMinH || item.settlementMaxH ? `${item.settlementMinH ?? '—'}〜${item.settlementMaxH ?? '—'}h` : '—'} />
          <Row label="リモート" value={`${REMOTE_LABEL[item.remoteType]}${item.onsiteNote ? `（${item.onsiteNote}）` : ''}`} />
          <Row label="開始" value={item.endDate ? `${item.startDate} 〜 ${item.endDate}` : item.startDate} />
          <Row label="稼働" value={item.daysPerWeek} />
          <Row label="作業場所" value={item.workLocation} />
          <Row label="商流" value={item.supplyChain} />
          <Row label="支払サイト" value={item.paymentSiteDays === null ? '—' : `${item.paymentSiteDays}日`} />
          {item.actualMonthlyIncl ? <Row label="実単価（税込）" value={formatMan(item.actualMonthlyIncl)} /> : null}
          {item.sourceUrl ? (
            <Row
              label="案件ページ"
              value={
                <Anchor href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} aria-hidden /> 開く
                </Anchor>
              }
            />
          ) : null}
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="xs">
          <Title order={3}>スキル</Title>
          <Group gap={4}>
            {item.mustSkills.map((sk) => (
              <Badge key={`m-${sk}`} variant="filled">{sk}</Badge>
            ))}
            {item.niceSkills.map((sk) => (
              <Badge key={`n-${sk}`} variant="default">{sk}</Badge>
            ))}
            {item.mustSkills.length + item.niceSkills.length === 0 ? <Text size="sm" c="dimmed">未登録</Text> : null}
          </Group>
          {axes.length > 0 ? (
            <Group gap="sm">
              {axes.map((axis, i) => (
                <Text key={axis} size="sm">
                  {axis}: {fitMark(item.fitScores?.[i])}
                </Text>
              ))}
            </Group>
          ) : null}
        </Stack>
      </Card>

      {item.note ? (
        <Card withBorder padding="md">
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{item.note}</Text>
        </Card>
      ) : null}

      <Card withBorder padding="md">
        <Stack gap="md">
          <NextActionEditor id={item.id} nextAction={item.nextAction} nextActionDue={item.nextActionDue} />
          <StatusChanger id={item.id} status={item.status} />
        </Stack>
      </Card>

      <CaseLogList caseId={item.id} log={log} today={today} />
      <RawTextPanel text={item.rawText} />

      <FormDrawer opened={editing} onClose={() => setEditing(false)} title="案件を編集">
        <CaseForm item={item} axes={axes} onSaved={() => setEditing(false)} />
      </FormDrawer>
    </PageShell>
  )
}
```

`getSettingsData` は Task 11 で作る。このタスクでは `src/server/settings.ts` に最小版を置く:

```ts
import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { readAxes, readThresholds } from './repository'

export const getSettingsData = createServerFn().handler(async () => {
  const db = getDb()
  const [thresholds, axes] = await Promise.all([readThresholds(db), readAxes(db)])
  return { thresholds, axes }
})
```

- [ ] **Step 6: 動作確認・検証・コミット**

dev で 1 件投入 → 詳細で: ステータスを `applied` → `meeting` に変更（ログに 2 行）→ `applied` へ戻す選択肢が無い → `declined` で確認ダイアログ → 次の一手と期日を保存 → メモ追加/削除 → 原文が折りたたみで一致 → 編集 Drawer で単価を変えて保存し `source_tax_basis` が変わらないことを D1 で確認。390×844 でも確認。

```bash
npm run format:check && npm run typecheck && npm run test:coverage && npm run test:server && npm run build && npm run check:pii
git add -A
git commit -m "feat(cases): 詳細（条件・ステータス変更・次の一手・経緯・原文・編集・削除）

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: ホーム（期日順・進行中の要約・最近のログ）

**Files:**
- Create: `src/server/home.ts` `src/components/home/DueList.tsx` `src/components/home/PipelineStats.tsx` `src/components/home/RecentLog.tsx`
- Modify: `src/routes/index.tsx`

**Interfaces:**
- Consumes: `listCases` `recentLog`（repository）／`withDue` `dueState`／`median` `formatMan`／`describeLog` `formatLogAt`／`statusGroup`
- Produces: `homeData(): Promise<{ due: DueItem[]; activeCount: number; medianIncl: number | null; recent: RecentItem[]; today: string }>`（`DueItem = { id; company; title; nextAction; nextActionDue: string }`、`RecentItem = { id; caseId; company; title; at; kind; fromStatus; toStatus; body }`）

- [ ] **Step 1: `src/server/home.ts`**

```ts
import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { withDue } from '../lib/deadlines'
import { formatJst } from '../lib/jst'
import { median } from '../lib/rate'
import { statusGroup } from '../lib/status'
import { listCases, recentLog } from './repository'

export const homeData = createServerFn().handler(async () => {
  const db = getDb()
  const [rows, recent] = await Promise.all([listCases(db), recentLog(db, 10)])
  const active = rows.filter((c) => statusGroup(c.status) === 'active')
  return {
    due: withDue(active).map((c) => ({
      id: c.id,
      company: c.company,
      title: c.title,
      nextAction: c.nextAction,
      nextActionDue: c.nextActionDue,
    })),
    activeCount: active.length,
    medianIncl: median(active.map((c) => c.monthlyMaxIncl)),
    recent,
    today: formatJst(new Date().toISOString(), { withTime: false }),
  }
})
```

- [ ] **Step 2: コンポーネント 3 つ**

```tsx
// src/components/home/DueList.tsx
import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { dueState } from '../../lib/deadlines'

const COLOR = { overdue: 'red', today: 'orange', soon: 'yellow', later: 'gray' } as const
type Item = { id: string; company: string; title: string; nextAction: string | null; nextActionDue: string }

export function DueList({ items, today }: { items: Item[]; today: string }) {
  if (items.length === 0) return null
  return (
    <Stack gap="xs">
      <Title order={2}>期日順</Title>
      {items.map((i) => (
        <Link key={i.id} to="/cases/$id" params={{ id: i.id }} style={{ textDecoration: 'none' }}>
          <Card withBorder padding="sm">
            <Group wrap="nowrap" align="flex-start" gap="sm">
              <Badge color={COLOR[dueState(i.nextActionDue, today)]} variant="light" style={{ flexShrink: 0 }}>
                {i.nextActionDue}
              </Badge>
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={600} lineClamp={1}>{i.nextAction ?? '（次の一手が未設定）'}</Text>
                <Text size="xs" c="dimmed" lineClamp={1}>{i.company}・{i.title}</Text>
              </Stack>
            </Group>
          </Card>
        </Link>
      ))}
    </Stack>
  )
}
```

```tsx
// src/components/home/PipelineStats.tsx
import { Card, Group, Stack, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { formatMan } from '../../lib/rate'

export function PipelineStats({ activeCount, medianIncl }: { activeCount: number; medianIncl: number | null }) {
  return (
    <Link to="/cases" search={{ group: 'active' }} style={{ textDecoration: 'none' }}>
      <Card withBorder padding="md">
        <Group grow>
          <Stack gap={0} align="center">
            <Text size="xs" c="dimmed">進行中</Text>
            <Text fw={700} fz={28}>{activeCount}<Text span size="sm"> 本</Text></Text>
          </Stack>
          <Stack gap={0} align="center">
            <Text size="xs" c="dimmed">税込中央値</Text>
            <Text fw={700} fz={28}>{formatMan(medianIncl)}</Text>
          </Stack>
        </Group>
      </Card>
    </Link>
  )
}
```

```tsx
// src/components/home/RecentLog.tsx
import { Stack, Text, Timeline, Title } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { describeLog, formatLogAt, type LogLike } from '../../lib/caseLog'

type Item = LogLike & { caseId: string; company: string; title: string }

export function RecentLog({ items }: { items: Item[] }) {
  if (items.length === 0) return null
  return (
    <Stack gap="xs">
      <Title order={2}>最近の動き</Title>
      <Timeline bulletSize={12} lineWidth={2}>
        {items.map((e) => (
          <Timeline.Item key={e.id} title={formatLogAt(e)}>
            <Link to="/cases/$id" params={{ id: e.caseId }}>
              <Text size="sm">{describeLog(e)}</Text>
            </Link>
            <Text size="xs" c="dimmed">{e.company}・{e.title}</Text>
          </Timeline.Item>
        ))}
      </Timeline>
    </Stack>
  )
}
```

- [ ] **Step 3: `src/routes/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'

import { EmptyState } from '../components/EmptyState'
import { PageShell } from '../components/PageShell'
import { DueList } from '../components/home/DueList'
import { PipelineStats } from '../components/home/PipelineStats'
import { RecentLog } from '../components/home/RecentLog'
import { homeData } from '../server/home'

export const Route = createFileRoute('/')({ component: Home, loader: () => homeData() })

function Home() {
  const { due, activeCount, medianIncl, recent, today } = Route.useLoaderData()
  return (
    <PageShell title="ホーム">
      <PipelineStats activeCount={activeCount} medianIncl={medianIncl} />
      <DueList items={due} today={today} />
      {recent.length === 0 ? (
        <EmptyState emoji="📋" title="まだ案件がありません" description="案件タブの取込から登録できます。" />
      ) : (
        <RecentLog items={recent} />
      )}
    </PageShell>
  )
}
```

- [ ] **Step 4: 動作確認・検証・コミット**

期日ありの案件で「期日順」が出る／期日なしなら節ごと出ない／期限切れは赤／統計カードが案件タブへ飛ぶ。

```bash
npm run format:check && npm run typecheck && npm run test:coverage && npm run test:server && npm run build && npm run check:pii
git add -A
git commit -m "feat(home): 期日順・進行中の要約・最近の動き

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: 取込フォーム（/import）

**Files:**
- Create: `src/components/import/ImportForm.tsx`
- Modify: `src/routes/import.tsx`（Task 7 の仮置きを置換）

**Interfaces:**
- Consumes: `importCase`（`server/cases.ts`）／`parseCaseJson` `toCaseRow` `CASE_JSON_EXAMPLE`（`lib/caseInput.ts`）／`formatMan`／`ROUTE_LABEL` `REMOTE_LABEL`
- Produces: `ImportForm({ onSaved })`

- [ ] **Step 1: `ImportForm`**（クライアント側で先に `parseCaseJson` を通してプレビューを出す。保存はサーバーで再検証）

```tsx
import { Alert, Button, Card, Code, Stack, Text, Textarea } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Link } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useState } from 'react'

import { Row } from '../DetailRow'
import { CASE_JSON_EXAMPLE, parseCaseJson, toCaseRow } from '../../lib/caseInput'
import { REMOTE_LABEL, ROUTE_LABEL } from '../../lib/enums'
import { formatMan } from '../../lib/rate'
import { importCase } from '../../server/cases'

export function ImportForm({ onSaved }: { onSaved: (id: string) => void }) {
  const save = useServerFn(importCase)
  const [json, setJson] = useState('')
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState<{ id: string; company: string; title: string } | null>(null)
  const parsed = useMemo(() => (json.trim() ? parseCaseJson(json) : null), [json])
  const preview = parsed?.ok ? toCaseRow(parsed.input) : null

  async function submit() {
    setSaving(true)
    setDuplicate(null)
    try {
      const r = await save({ data: { json } })
      if (r.ok) {
        notifications.show({ message: '登録しました' })
        onSaved(r.id)
        return
      }
      if ('duplicate' in r) setDuplicate(r.duplicate)
      else notifications.show({ message: '検証に失敗しました（内容を確認してください）', color: 'red' })
    } catch {
      notifications.show({ message: '保存できませんでした', color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Stack gap="md">
      <Textarea
        label="案件票の JSON"
        description="Claude Code が出した JSON をそのまま貼る。金額は案件票の表示のまま、taxBasis で税込/税抜を宣言"
        placeholder={CASE_JSON_EXAMPLE}
        autosize
        minRows={8}
        maxRows={24}
        className="rawtext"
        value={json}
        onChange={(e) => setJson(e.currentTarget.value)}
      />
      {parsed && !parsed.ok ? (
        <Alert color="red" title="検証エラー">
          <Stack gap={2}>
            {parsed.issues.map((i, n) => (
              <Text key={n} size="sm">
                <Code>{i.path || '(root)'}</Code> {i.message}
              </Text>
            ))}
          </Stack>
        </Alert>
      ) : null}
      {preview ? (
        <Card withBorder padding="md">
          <Stack gap="xs">
            <Row label="企業 / 案件" value={`${preview.company} / ${preview.title}`} />
            <Row label="経路" value={ROUTE_LABEL[preview.route]} />
            <Row label="税込上限" value={`${formatMan(preview.monthlyMaxIncl)}（案件票は${preview.sourceTaxBasis === 'excl' ? '税抜' : '税込'}表示）`} />
            <Row label="リモート" value={`${REMOTE_LABEL[preview.remoteType]}${preview.onsiteNote ? `（${preview.onsiteNote}）` : ''}`} />
            <Row label="開始" value={preview.startDate} />
            <Row label="必須" value={preview.mustSkills.join('、') || '—'} />
            <Row label="原文" value={`${preview.rawText.length.toLocaleString('ja-JP')} 文字`} />
          </Stack>
        </Card>
      ) : null}
      {duplicate ? (
        <Alert color="orange" title="同じ案件が既にあります">
          <Link to="/cases/$id" params={{ id: duplicate.id }}>
            {duplicate.company} / {duplicate.title} を開く
          </Link>
        </Alert>
      ) : null}
      <Button onClick={submit} loading={saving} disabled={!preview} fullWidth>
        この内容で登録
      </Button>
    </Stack>
  )
}
```

- [ ] **Step 2: `src/routes/import.tsx`**

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { ImportForm } from '../components/import/ImportForm'
import { PageShell } from '../components/PageShell'

export const Route = createFileRoute('/import')({ component: Page })

function Page() {
  const navigate = useNavigate()
  return (
    <PageShell title="取込" description="Claude Code が構造化した JSON を貼って登録する。通常は npm run add-case で入れる（スマホ用の逃げ道）">
      <ImportForm onSaved={(id) => navigate({ to: '/cases/$id', params: { id } })} />
    </PageShell>
  )
}
```

- [ ] **Step 3: 動作確認・検証・コミット**

`CASE_JSON_EXAMPLE` を貼る → プレビューに「123.2万（案件票は税抜表示）」→ 登録 → 詳細へ → もう一度同じ JSON → 「同じ案件が既にあります」のリンク → 壊れた JSON でエラー表示。

```bash
npm run format:check && npm run typecheck && npm run test:coverage && npm run build && npm run check:pii
git add -A
git commit -m "feat(import): JSON 貼付の取込フォーム（プレビュー・重複案内）

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: 比較（/compare）と設定（/settings）

**Files:**
- Create: `src/components/compare/CompareTable.tsx` `src/routes/compare.tsx` `src/routes/settings.tsx`
- Modify: `src/server/settings.ts`（`saveThresholds` `saveAxes` を足す）

**Interfaces:**
- Consumes: `buildCompareRows` `type Thresholds` `DEFAULT_THRESHOLDS`（`lib/compare.ts`）／`listCasesFn` `type CaseListItem`／`readThresholds` `readAxes` `writeSetting`（repository）／`statusGroup`
- Produces: `getSettingsData(): Promise<{ thresholds: Thresholds; axes: string[] }>`／`saveThresholds({ minMonthlyIncl, minHourlyExcl, targetStart, maxOnsitePerMonth })`／`saveAxes({ axes: string[] })`／`CompareTable({ cases, thresholds, axes })`

- [ ] **Step 1: `src/server/settings.ts` を完成させる**

```ts
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { getDb } from '../db/client'
import { readAxes, readThresholds, writeSetting } from './repository'

export const getSettingsData = createServerFn().handler(async () => {
  const db = getDb()
  const [thresholds, axes] = await Promise.all([readThresholds(db), readAxes(db)])
  return { thresholds, axes }
})

const nullableNumber = z.number().int().min(0).nullable()

export const thresholdsInput = z.object({
  minMonthlyIncl: nullableNumber,
  minHourlyExcl: nullableNumber,
  targetStart: z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM').nullable(),
  maxOnsitePerMonth: nullableNumber,
})

export const saveThresholds = createServerFn({ method: 'POST' })
  .validator(thresholdsInput)
  .handler(async ({ data }) => {
    await writeSetting(getDb(), 'thresholds', JSON.stringify(data))
    return { ok: true as const }
  })

export const saveAxes = createServerFn({ method: 'POST' })
  .validator(z.object({ axes: z.array(z.string().trim().min(1).max(40)).max(10) }))
  .handler(async ({ data }) => {
    await writeSetting(getDb(), 'axes', JSON.stringify(data.axes))
    return { ok: true as const }
  })
```

- [ ] **Step 2: `CompareTable`**

```tsx
import { Table, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { buildCompareRows, type CompareCase, type Thresholds } from '../../lib/compare'

export function CompareTable({ cases, thresholds, axes }: { cases: CompareCase[]; thresholds: Thresholds; axes: string[] }) {
  const rows = buildCompareRows(cases, thresholds, axes)
  return (
    <Table.ScrollContainer minWidth={Math.max(600, 180 + cases.length * 200)}>
      <Table className="compare-table" withColumnBorders stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>項目</Table.Th>
            {cases.map((c) => (
              <Table.Th key={c.id} style={{ minWidth: 200 }}>
                <Link to="/cases/$id" params={{ id: c.id }}>
                  <Text fw={700} lineClamp={2}>{c.title}</Text>
                </Link>
                <Text size="xs" c="dimmed">{c.company}</Text>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.key}>
              <Table.Th scope="row">{r.label}</Table.Th>
              {r.cells.map((cell) => (
                <Table.Td key={cell.caseId} className={cell.bad ? 'cell-bad' : undefined}>
                  <Text size="sm" className="breakable">{cell.text}</Text>
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
```

- [ ] **Step 3: `src/routes/compare.tsx`**（`?ids=` は id のカンマ区切り。無ければ進行中すべて）

```tsx
import { Checkbox, Group, Stack, Text } from '@mantine/core'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { CompareTable } from '../components/compare/CompareTable'
import { EmptyState } from '../components/EmptyState'
import { PageShell } from '../components/PageShell'
import { listCasesFn } from '../server/cases'
import { getSettingsData } from '../server/settings'

const search = z.object({ ids: z.string().optional() })

export const Route = createFileRoute('/compare')({
  component: Page,
  validateSearch: (s) => search.parse(s),
  loader: async () => {
    const [{ cases }, settings] = await Promise.all([listCasesFn(), getSettingsData()])
    return { cases, ...settings }
  },
})

function Page() {
  const { cases, thresholds, axes } = Route.useLoaderData()
  const { ids } = Route.useSearch()
  const navigate = useNavigate({ from: '/compare' })
  const candidates = cases.filter((c) => c.group === 'active' || c.group === 'onhold')
  const selected = ids ? ids.split(',').filter(Boolean) : candidates.filter((c) => c.group === 'active').map((c) => c.id)
  const shown = candidates.filter((c) => selected.includes(c.id))
  const hasThreshold = Object.values(thresholds).some((v) => v !== null)

  return (
    <PageShell
      title="比較"
      description={hasThreshold ? '赤いセルは設定の閾値を下回る条件' : '設定で閾値を入れると条件を下回るセルが赤くなります'}
    >
      <Stack gap="md">
        <Checkbox.Group
          value={selected}
          onChange={(v) => navigate({ search: { ids: v.join(',') }, replace: true })}
          label="比較する案件"
        >
          <Group gap="sm" mt="xs">
            {candidates.map((c) => (
              <Checkbox key={c.id} value={c.id} label={`${c.title}（${c.company}）`} />
            ))}
          </Group>
        </Checkbox.Group>
        {shown.length === 0 ? (
          <EmptyState emoji="⚖️" title="比較する案件を選んでください" />
        ) : (
          <CompareTable cases={shown} thresholds={thresholds} axes={axes} />
        )}
        <Text size="xs" c="dimmed">参画・終了・辞退・見送りは対象外。時給は税抜 ÷ 基準時間。</Text>
      </Stack>
    </PageShell>
  )
}
```

- [ ] **Step 4: `src/routes/settings.tsx`**

```tsx
import { Button, Card, Group, NumberInput, Stack, TagsInput, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'

import { PageShell } from '../components/PageShell'
import { extractErrorMessage } from '../lib/formError'
import { getSettingsData, saveAxes, saveThresholds } from '../server/settings'

export const Route = createFileRoute('/settings')({ component: Page, loader: () => getSettingsData() })

type Num = number | ''
const n = (v: Num) => (v === '' ? null : v)

function Page() {
  const { thresholds, axes } = Route.useLoaderData()
  const router = useRouter()
  const saveT = useServerFn(saveThresholds)
  const saveA = useServerFn(saveAxes)
  const [saving, setSaving] = useState(false)
  const [axisValues, setAxisValues] = useState<string[]>(axes)
  const form = useForm<{ minMonthlyIncl: Num; minHourlyExcl: Num; targetStart: string; maxOnsitePerMonth: Num }>({
    initialValues: {
      minMonthlyIncl: thresholds.minMonthlyIncl ?? '',
      minHourlyExcl: thresholds.minHourlyExcl ?? '',
      targetStart: thresholds.targetStart ?? '',
      maxOnsitePerMonth: thresholds.maxOnsitePerMonth ?? '',
    },
  })

  async function submitThresholds(v: typeof form.values) {
    setSaving(true)
    try {
      await saveT({
        data: {
          minMonthlyIncl: n(v.minMonthlyIncl),
          minHourlyExcl: n(v.minHourlyExcl),
          targetStart: v.targetStart.trim() || null,
          maxOnsitePerMonth: n(v.maxOnsitePerMonth),
        },
      })
      await router.invalidate()
      notifications.show({ message: '閾値を保存しました' })
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    } finally {
      setSaving(false)
    }
  }

  async function submitAxes() {
    try {
      await saveA({ data: { axes: axisValues } })
      await router.invalidate()
      notifications.show({ message: '軸を保存しました' })
    } catch (e) {
      notifications.show({ message: extractErrorMessage(e), color: 'red' })
    }
  }

  return (
    <PageShell title="設定" description="判断基準はここ（DB）にだけ置く。リポジトリには入らない">
      <Card withBorder padding="md">
        <form onSubmit={form.onSubmit(submitThresholds)}>
          <Stack gap="sm">
            <Title order={2}>閾値</Title>
            <Text size="sm" c="dimmed">比較ビューで下回るセルを赤くする。空欄は判定しない。</Text>
            <NumberInput label="単価下限（税込・円）" thousandSeparator="," min={0} {...form.getInputProps('minMonthlyIncl')} />
            <NumberInput label="時給下限（税抜・円）" thousandSeparator="," min={0} {...form.getInputProps('minHourlyExcl')} />
            <TextInput label="希望開始（YYYY-MM）これより後は赤" {...form.getInputProps('targetStart')} />
            <NumberInput label="出社の上限（回/月）" min={0} {...form.getInputProps('maxOnsitePerMonth')} />
            <Group justify="flex-end">
              <Button type="submit" loading={saving}>保存</Button>
            </Group>
          </Stack>
        </form>
      </Card>
      <Card withBorder padding="md">
        <Stack gap="sm">
          <Title order={2}>比較の軸</Title>
          <Text size="sm" c="dimmed">案件ごとに 0〜2 で付ける観点。順番は比較表の行順。</Text>
          <TagsInput label="軸" value={axisValues} onChange={setAxisValues} placeholder="入力して Enter" maxTags={10} />
          <Group justify="flex-end">
            <Button onClick={submitAxes}>保存</Button>
          </Group>
        </Stack>
      </Card>
    </PageShell>
  )
}
```

- [ ] **Step 5: 動作確認・検証・コミット**

設定で閾値（架空値）を入れる → 比較で下回りセルが赤 → 閾値を消すと赤が消える → 軸を 2 つ入れる → 編集フォームに軸の入力が出て、比較に ○△× が出る → 390×844 で横スクロール・先頭列固定。

```bash
npm run format:check && npm run typecheck && npm run test:coverage && npm run test:server && npm run build && npm run check:pii
git add -A
git commit -m "feat(compare,settings): 比較表（閾値ハイライト・軸）と設定

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: 過去案件の取込（import-history）とデザイン仕上げ

**Files:**
- Create: `scripts/import-history.ts` `scripts/lib/history.ts` `scripts/lib/history.test.ts` `history.local.example.json`
- Modify: `src/theme.ts` `src/styles.css` `public/icons/*`（デザイン仕上げ）、`README.md`

**Interfaces:**
- Consumes: `caseInputSchema` `toCaseRow`／`insertCaseStatements` `slugToId`
- Produces（`scripts/lib/history.ts`）: `historyFileSchema = z.object({ cases: z.array(z.object({ slug: z.string().min(1).max(100) }).and(caseInputSchema)) })`／`type HistoryFile`／`buildHistoryStatements(file: HistoryFile, at: string): string[]`
- Produces: `npm run import:history -- --remote|--local [--dry-run]`

- [ ] **Step 1: `scripts/lib/history.test.ts`**

```ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildHistoryStatements, historyFileSchema } from './history.ts'

const file = historyFileSchema.parse({
  cases: [
    {
      slug: 'ko-sha-2020',
      company: '甲社',
      title: '過去案件A',
      route: 'other',
      monthlyMax: 700000,
      taxBasis: 'incl',
      remoteType: 'onsite',
      startDate: '2020-04',
      endDate: '2021-03',
      rawText: '担当: ...',
      status: 'ended',
      mustSkills: ['Java'],
    },
  ],
})

describe('history', () => {
  it('slug から決定的 id で INSERT OR REPLACE を作る（冪等）', () => {
    const a = buildHistoryStatements(file, '2030-01-01T00:00:00Z')
    const b = buildHistoryStatements(file, '2030-01-01T00:00:00Z')
    assert.deepEqual(a, b)
    assert.equal(a.length, 2)
    assert.match(a[0], /^INSERT OR REPLACE INTO cases/)
    assert.match(a[0], /'ended'/)
    assert.match(a[1], /'import'/)
  })
})
```

- [ ] **Step 2: `scripts/lib/history.ts`**

```ts
import { z } from 'zod'

import { caseInputSchema, toCaseRow } from '../../src/lib/caseInput.ts'
import { insertCaseStatements, slugToId } from './caseSql.ts'

/** history.local.json の形。1 件 = caseInputSchema + slug（冪等キー） */
export const historyFileSchema = z.object({
  cases: z.array(z.object({ slug: z.string().min(1).max(100) }).and(caseInputSchema)),
})
export type HistoryFile = z.infer<typeof historyFileSchema>

export function buildHistoryStatements(file: HistoryFile, at: string): string[] {
  return file.cases.flatMap(({ slug, ...input }) =>
    insertCaseStatements({
      id: slugToId(`case:${slug}`),
      row: toCaseRow(input),
      at,
      importNote: 'import-history',
      logId: slugToId(`log:${slug}`),
      orReplace: true,
    }),
  )
}
```

- [ ] **Step 3: `scripts/import-history.ts`**

```ts
#!/usr/bin/env node
/**
 * 過去案件（history.local.json・gitignore）を D1 へ冪等に取り込む。
 *   npm run import:history -- --remote|--local [--dry-run]
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildHistoryStatements, historyFileSchema } from './lib/history.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = process.argv.includes('--remote') ? 'remote' : process.argv.includes('--local') ? 'local' : null
const dryRun = process.argv.includes('--dry-run')
if (!target) {
  console.error('使い方: npm run import:history -- --remote|--local [--dry-run]')
  process.exit(2)
}

const parsed = historyFileSchema.safeParse(JSON.parse(readFileSync(resolve(root, 'history.local.json'), 'utf8')))
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
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'freelance-pipeline', `--${target}`, '--file', sqlPath], {
    cwd: root,
    stdio: 'inherit',
  })
} finally {
  rmSync(dir, { recursive: true, force: true })
}
console.log('取り込みました')
```

`history.local.example.json`（架空値・コミットする。`.gitignore` の `*.local.json` に当たらないよう `.local.example.json` にする）:

```json
{
  "cases": [
    {
      "slug": "sample-2020",
      "company": "甲社",
      "title": "サンプル過去案件",
      "route": "other",
      "monthlyMax": 700000,
      "taxBasis": "incl",
      "remoteType": "onsite",
      "startDate": "2020-04",
      "endDate": "2021-03",
      "rawText": "担当した内容を箇条書きで",
      "mustSkills": ["Java"],
      "status": "ended",
      "actualMonthlyIncl": 700000
    }
  ]
}
```

`.gitignore` に `!history.local.example.json` を `*.local.json` の次の行に足す。

- [ ] **Step 4: ローカルで通し確認**

`cp history.local.example.json history.local.json` → `npm run import:history -- --local --dry-run` → `--local` を 2 回実行しても `SELECT count(*) FROM cases` が増えない → 一覧の「参画・終了」チップに出る → `rm history.local.json` と D1 の行を消す。

- [ ] **Step 5: デザイン仕上げ（`frontend-design` スキル）**

対象: `src/theme.ts`（藍のアクセント・グレーの段階・カードの罫線）・`src/styles.css`・`public/icons/icon-192.png` `icon-512.png`（sumai-log の流用をやめ、藍の地に白い「⇢」や「P」の単色アイコンを SVG → PNG で作る。`public/favicon.svg` も同じ）・`manifest.json` の `theme_color` を theme の primary 6 番と揃える。守ること: 本文 4.5:1・UI 3:1、ダークモード両方、390×844 と 1280 で崩れない、フォーカスリング。**実データを写したスクショを残さない**（確認は架空データで）。

- [ ] **Step 6: 検証とコミット**

```bash
npm run test:scripts && npm run format:check && npm run typecheck && npm run test:coverage && npm run test:server && npm run build && npm run check:pii
git add -A
git commit -m "feat(scripts): import-history（冪等取込）とデザイン仕上げ

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

### Task 13: Cloudflare の資源・Access・secret・Keyway・Workers Builds・実データ投入

このタスクは手元の CLI とダッシュボード操作を含む。実データ（現行の案件・辞退済み・過去案件）は**このリポジトリの外**（Claude Code の scratchpad と `*.local.json`）にだけ置く。

**Files:**
- Modify: `wrangler.jsonc`（database_id / ACCESS_TEAM_DOMAIN / ACCESS_POLICY_AUD）、`README.md`（本番手順・所有者の作業）

- [ ] **Step 1: D1 とマイグレーション**

```bash
npx wrangler d1 create freelance-pipeline      # 出力の database_id を wrangler.jsonc に貼る
npm run db:migrate:remote
```

- [ ] **Step 2: 初回デプロイ（Access 前。secret が無いので allowlist 空＝全拒否）**

```bash
npm run deploy
curl -s -o /dev/null -w '%{http_code}\n' https://freelance-pipeline.saitotakuya0719.workers.dev/   # 403
```

- [ ] **Step 3: Cloudflare Access アプリ**

Zero Trust → Access → Applications → Add → Self-hosted:
- Application name `freelance-pipeline`／Session duration **1 month**／Application domain `freelance-pipeline.saitotakuya0719.workers.dev`
- Identity providers: 既設の Google だけ（「利用可能なすべての IdP を受け入れる」をオフ。One-time PIN が既定で残る罠）
- Policy: Allow / Include → Emails → 本人
- Overview の **Application Audience (AUD) Tag** を `wrangler.jsonc` の `ACCESS_POLICY_AUD` に、`ACCESS_TEAM_DOMAIN` に `https://odd-bush-1f0d.cloudflareaccess.com`（sumai-log と同じチーム）。AUD の行末に `// gitleaks:allow`

- [ ] **Step 4: secret と `.dev.vars`（実値）**

```bash
printf '%s' '<本人のメール>' | npx wrangler secret put ACCESS_ALLOWED_EMAILS
npx wrangler secret list        # 1 件
npm run deploy
```

`.dev.vars` の `DEV_IDENTITY_EMAIL` `ACCESS_ALLOWED_EMAILS` も実値にする（gitignore 済み）。

- [ ] **Step 5: 認証の実確認**

シークレットウィンドウで本番 URL → Access のログイン → Google → ホーム。別の Google アカウントで拒否。iPhone Safari でもログインしてホームが出る（sumai-log で確認済みだが本アプリでも 1 度見る）。

- [ ] **Step 6: Keyway**

```bash
keyway init && rm -f .env
keyway push -e development -f .dev.vars -y
printf 'ENVIRONMENT=production\nACCESS_ALLOWED_EMAILS=%s\n' '<実値>' > .dev.vars.production
keyway push -e production -f .dev.vars.production -y
rm .dev.vars.production
git check-ignore -q .dev.vars && echo ignored
keyway pull -e development -f .dev.vars.pulled -y && diff -q .dev.vars .dev.vars.pulled && rm .dev.vars.pulled
```

- [ ] **Step 7: Workers Builds**

Workers & Pages → freelance-pipeline → Settings → Build → Connect to GitHub → `tktk7l9/freelance-pipeline` / `main` / Build `npm run build` / Deploy `npx wrangler deploy`。空コミットを push し `npx wrangler deployments list` の先頭 `Created` が push 時刻と一致することを確認（無音で止まる前例あり。builds MCP で裏取り）。

- [ ] **Step 8: 判断基準と実データの投入（リポジトリ外）**

1. `/settings` で閾値 4 つと軸 3 つを入れる（値は本人の手元のメモから。リポジトリと会話ログに書かない）
2. 現行の案件（進行中 + 辞退済み）を 1 件ずつ Claude Code が JSON にし `npm run add-case -- --file=… --remote`。ステータスと「次の一手・期日」は JSON に含める。辞退済みは `status: 'declined'`・理由を `note` に
3. `history.local.json` を Claude Code が作る（元: 職務経歴書リポジトリの `src/data/experience.ts` と `~/Downloads` のスキルシート xlsx。xlsx は `python3 -m pip install openpyxl` か `in2csv` で読む）→ `npm run import:history -- --remote`
4. `/cases` `/compare` `/` で全件が見えることを iPhone と PC で確認
5. `npm run db:export` → `backups/` を Drive `backups/freelance-pipeline` へ複製
6. Vault `Projects/案件パイプライン.md` の本文を「**2026-09-xx アプリへ移行済み**: https://freelance-pipeline.saitotakuya0719.workers.dev（判断基準はアプリの設定に）」の数行に置き換え、経緯ログへのリンクだけ残す

- [ ] **Step 9: README の本番手順・所有者の作業を書き、コミット**

README に sumai-log の「本番」節（D1 → 初回デプロイ → Access → secret → 認証確認 → Keyway → Workers Builds → バックアップ）を本アプリの名前で書く。メール・AUD の実値は書かない（AUD は `wrangler.jsonc` にある）。

```bash
npm run check:pii
git add -A
git commit -m "chore(deploy): D1・Access・secret・Keyway・Workers Builds の手順と本番設定

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
```

---

## 検証（仕様 §I との対応）

| 仕様 | どこで確かめるか |
|---|---|
| 完了基準 7 コマンド green | 各タスク末尾 + CI |
| 認証 4 ケースで 403 | `src/lib/access.test.ts`（コピー）+ Task 13 Step 5 |
| `add-case --dry-run` → 実投入 → 原文一致 | Task 6 Step 8・Task 8 Step 6 |
| `taxBasis: excl` の ×1.1 | `rate.test.ts` `caseInput.test.ts`・Task 10 Step 3 のプレビュー |
| 重複で中断・`--update` で上書き | Task 6 Step 8・`cases.worker-test.ts` |
| 不正 JSON は項目名つきで拒否 | `caseInput.test.ts`・Task 10 |
| 後戻り拒否・終端の確認・ログ自動行 | `status.test.ts` `cases.worker-test.ts`・Task 8 Step 6 |
| 閾値変更でハイライト追随・fitScores 未設定は「—」 | `compare.test.ts`・Task 11 Step 5 |
| iPhone 390×844・1280 | Task 7/8/11 の動作確認 |
| デプロイの `Created` 一致 | Task 13 Step 7 |
