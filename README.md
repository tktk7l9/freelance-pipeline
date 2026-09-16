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
