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
