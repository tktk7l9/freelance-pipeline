# freelance-pipeline

[![Keyway Secrets](https://www.keyway.sh/badge.svg?repo=tktk7l9/freelance-pipeline)](https://www.keyway.sh/vaults/tktk7l9/freelance-pipeline)

フリーランスの案件管理。選考中の案件を 応募 → 書類 → 商談 → 内定 → 参画 で追い、案件票の原文ごと自分の DB（Cloudflare D1）に残す個人用アプリ。

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

|                                              |                                          |
| -------------------------------------------- | ---------------------------------------- |
| `npm test`                                   | 純粋関数・実 D1・スクリプトのテスト      |
| `npm run test:coverage`                      | `src/lib` の 100% ゲート                 |
| `npm run check:pii`                          | 実データ混入の検査                       |
| `npm run add-case -- --file=<json> --remote` | 案件票（JSON）を D1 へ                   |
| `npm run import:history -- --remote`         | 過去案件（`history.local.json`）を D1 へ |
| `npm run db:export`                          | 本番 D1 のバックアップ                   |

## 案件票の登録

構造化は Claude Code 側で行う（AGENTS.md「案件票の登録」）。手で入れる場合は同じ JSON を
アプリの「取込」画面に貼る。JSON の形は `src/lib/caseInput.ts` の `CASE_JSON_EXAMPLE`。

```bash
npm run add-case -- --file=/path/to/case.json --remote --dry-run   # 検証だけ
npm run add-case -- --file=/path/to/case.json --remote             # 登録
npm run add-case -- --file=/path/to/case.json --remote --update=<id>
```

## 過去案件の取込

これまでの参画実績は `history.local.json`（gitignore・実データ）にまとめて置き、
`import:history` で D1 に入れる。形は `history.local.example.json` を写して使う。
案件票との違いは `slug` が 1 本増えることだけで、中身は同じ `caseInputSchema`。

```bash
cp history.local.example.json history.local.json
npm run import:history -- --local --dry-run   # 検証と件数だけ
npm run import:history -- --remote            # 取込
```

`slug` から決まった id を作って `INSERT OR REPLACE` するので、**何度流しても行は増えない**。
ファイルを直して流し直せばその内容に揃う。`status` はファイルの値がそのまま入る（`ended` など）。

## デザインの決めごと

- 地は寒色のスレート、アクセントは藍（`indigo`）の 1 色だけ。色は状態を表すために使い、飾りには使わない
- 期限の赤・橙やステータスの色は `src/lib/deadlines.ts` / `status.ts` のデータ表現で、2 本目のアクセントではない
- 影を落とすのは唯一浮いている FAB だけ。それ以外は面の段と罫線で組む
- 本文 4.5:1・UI 3:1 をライト/ダーク両方で満たす値を選んである（根拠は `src/theme.ts` の冒頭）
- アイコン（`public/favicon.svg` と `public/icons/*.png`）は藍の地に白い 3 本の帯＝絞り込まれていくパイプライン

## 本番

デプロイ先: `https://freelance-pipeline.saitotakuya0719.workers.dev`（Cloudflare Access の背後）。
Worker は Access 設定（`ACCESS_TEAM_DOMAIN` / `ACCESS_POLICY_AUD`）か allowlist secret が
欠けていると **必ず 403 を返す**（fail-closed）。以下は初回構築の手順（実施済み）と、
以後の運用手順。

### 前提

```bash
npx wrangler login       # 未ログインなら
npx wrangler whoami       # account id を確認
```

### 1. D1

```bash
npx wrangler d1 create freelance-pipeline    # 出力の database_id を wrangler.jsonc に貼る
npm run db:migrate:remote                    # drizzle/migrations の全件を本番 D1 に適用
```

同名の資源が既にあれば `npx wrangler d1 list` で確認して使い回す（重複作成しない）。

スキーマを変更したとき（`npm run db:generate` で新しいマイグレーションを生成したとき）は、
`npm run db:migrate:remote` を手動で本番 D1 に適用する（自動適用の仕組みは無い）。

### 2. 初回デプロイ（Access 設定前）

```bash
npm run deploy
curl -s -o /dev/null -w '%{http_code}\n' https://freelance-pipeline.saitotakuya0719.workers.dev/
```

secret も Access 設定も無い状態なので `403` が返る。これは仕様どおり（拒否側に倒れている）。

### 3. Cloudflare Access アプリ

Zero Trust チームドメインは `https://odd-bush-1f0d.cloudflareaccess.com`（sumai-log と同じ
team `odd-bush-1f0d`）。既存の Google IdP を使う。API（`POST /accounts/{account_id}/access/apps`、
続けて `POST /accounts/{account_id}/access/apps/{app_id}/policies`）で作成済み。ダッシュボードから
同じ設定をする場合、あるいは許可メールを追加する場合の手順:

Zero Trust → Access → Applications → `freelance-pipeline` → Edit（または Add → Self-hosted で新規）:

- Application name: `freelance-pipeline` ／ Session duration: **720h（1ヶ月）**
- Application domain: `freelance-pipeline.saitotakuya0719.workers.dev`
- Identity providers: 既設の Google だけを選ぶ（「利用可能なすべての IdP を受け入れる」はオフ。
  One-time PIN が既定で残る罠がある）
- Policy: Allow / Include → Emails → 利用者のアドレス（現在はオーナーのみ）
- Overview の **Application Audience (AUD) Tag** を `wrangler.jsonc` の `ACCESS_POLICY_AUD` に、
  `ACCESS_TEAM_DOMAIN` と合わせて反映する（どちらも非秘密＝コミットしてよい。AUD 行末に
  `// gitleaks:allow`）

### 4. secret と `.dev.vars`

```bash
printf '%s' 'owner@example.com' | npx wrangler secret put ACCESS_ALLOWED_EMAILS
npx wrangler secret list        # 1 件。値の正しさはログインして確かめる
npm run deploy
```

`printf '%s'` を使う（`echo` だと末尾改行が値に混ざる）。引用符は値に含めない。
本アプリの secret はこの 1 本だけ（sumai-log の `MEMBERS` に相当するものは無い）。

ローカル開発は `.dev.vars.example` を `.dev.vars` にコピーして実際の値を入れる
（gitignore 済み）。`npm run check:pii` で実データがコミット対象に混入していないか
毎回確認する。

### 5. 認証の確認

- `curl` で JWT なしにアクセスすると Access のログインへ `302` リダイレクトされる
  （Worker のアプリ HTML には直接到達できない）
- シークレットウィンドウで本番 URL を開く → Access のログイン画面 → Google → ホームが出る
  （ブラウザでの確認は所有者が行う。下記「所有者の作業」参照）
- 許可外の Google アカウントでは Access が拒否する

### 6. Keyway（secret のチーム共有）

```bash
keyway pull -e development -f .dev.vars -y   # 開発用の実値を取得
```

本番値は `production` 環境に入っている（`ACCESS_ALLOWED_EMAILS` / `ENVIRONMENT=production`）。
Vault: https://app.keyway.sh/vaults/tktk7l9/freelance-pipeline

本番の正本は Cloudflare の secret。Keyway の production 環境は新しい機械で復旧するための控え。

Cloudflare の secret と Access ポリシーを更新したら、Keyway vault も同時に更新して古いままに
しない:

```bash
keyway push -e development -f .dev.vars -y

# 本番用の一時ファイルを作って push し、すぐ消す
printf 'ENVIRONMENT=production\nACCESS_ALLOWED_EMAILS=%s\n' '<実値>' > .dev.vars.production
keyway push -e production -f .dev.vars.production -y
rm .dev.vars.production
```

### 7. Workers Builds（GitHub 連携・ダッシュボード）

**⬜ 未接続。所有者がダッシュボードで行う。** Workers & Pages → `freelance-pipeline` →
Settings → Build → Connect to GitHub:

- Repository: `tktk7l9/freelance-pipeline` ／ Branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

接続後、空コミットを `main` に push して自動デプロイが動くことを確認する:

```bash
npx wrangler deployments list   # 先頭の Created が push 時刻（UTC）と一致するか確認
```

Workers Builds が無音で止まる既知の事故があるため、接続直後は必ずこの突合をする。ずれていたら
手元から `npm run deploy` で応急し、原因を調べる。

### 8. 所有者の作業

自動化しない、人がやる一回きりの作業。

- **Workers Builds の GitHub 連携**（上記 7）: ダッシュボードでの接続と、空コミットでの動作確認
- **認証の実機確認**: シークレットウィンドウで本番 URL を開き、Google でログインしてホームが
  出ることを確認する。別の Google アカウントでは拒否されることも確認する
- **iPhone Safari でのログイン確認**: 本番 URL を開いて Google でログインし、ホームが出ることを
  1 度確認する（sumai-log で確認済みの経路だが、本アプリでも 1 度見る）

### 9. バックアップ

```bash
npm run db:export   # backups/freelance-pipeline-YYYYMMDD.sql（gitignore 済み）
```

月次: 出力した SQL を Google Drive の `backups/freelance-pipeline` へコピーする。
