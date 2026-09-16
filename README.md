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
