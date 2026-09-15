# freelance-pipeline — フリーランス案件パイプライン管理 設計仕様

日付: 2026-09-16 ／ 状態: 承認済み（実装前）

## Context（なぜ作るか）

選考中の案件が 10 本になり、Markdown 1 枚での管理が限界に来た。加えて案件データがエージェント各社の
プラットフォームに閉じ込められていて、エージェントを離れると過去の実績を持ち出せない。
**選考中の案件を応募→書類→商談→内定→参画で追跡し、案件票の原文ごと自分の DB に残す**私的 Web アプリを作る。

決まっていること（前セッション + 本セッション）:
- 主目的 = 選考中パイプラインの管理。過去案件の取込も今回に含める（本人が「全部入り」を選択）
- 入力 = 案件票を Claude Code が構造化 → スクリプトが zod 検証 → D1 へ投入。**アプリは Anthropic API を持たない**
- PC で登録・比較、スマホで一覧確認とステータス更新。レスポンシブ必須
- public リポジトリ（機微はすべて D1 の中、リポジトリはスキーマと UI だけ）
- sumai-log（同じ雛形・2026-09-16 に全フェーズ本番稼働）の後に着手。Cloudflare Access の iPhone Safari ログインは sumai-log で実機確認済み・問題なし

---

## §A 技術スタック

| 分岐 | 判断 | 根拠 |
|---|---|---|
| 雛形 | **sumai-log を複製**（TanStack Start on Cloudflare Workers + Mantine v9 + D1/Drizzle + Cloudflare Access） | 同じ雛形で 4 フェーズを 2 日で本番稼働させた実績。認証・CSRF・セキュリティヘッダ・check-pii・Workers Builds・PWA を流用 |
| 除去するもの | R2・写真・地図（Leaflet）・YouTube/oEmbed・用語集・MEMBERS（複数利用者） | 利用者は 1 人。画像も地図も持たない |
| 環境変数 | Keyway（public 無料枠）で `.dev.vars` を管理。本番の正本は `wrangler secret` | |
| AI | **持たない** | 構造化は Claude Code 側。秘密が増えない |

不採用: Next.js + Vercel（無料枠超過で 402 を起こした側）／Obsidian + Dataview（スマホ編集が弱く構造化できない）。

## §B データモデル（D1 / Drizzle）

共通: `id` text（`crypto.randomUUID()`）・`createdAt` / `updatedAt` は **両方 `sql\`(datetime('now'))\`` で書く**（更新側だけ ISO 文字列にすると 1 列 2 書式になり ORDER BY が狂う）。日付は TEXT の ISO-8601、金額は円の整数。

### `cases`（1 行 = 1 案件。選考中も過去案件も同じ表）

| 列 | 型 | 備考 |
|---|---|---|
| id | text PK | |
| company | text NOT NULL | 企業名 |
| title | text NOT NULL | 案件名 |
| route | enum `levtech` / `findy` / `direct` / `other` NOT NULL | 経路 |
| agentName | text? | 担当エージェント名（誰に聞くか） |
| **monthlyMaxIncl** | int NOT NULL | 単価上限・**税込**（円）。列名に Incl を入れて取り違えを型で防ぐ |
| **monthlyMinIncl** | int? | 下限が明示されている場合のみ・税込 |
| **sourceTaxBasis** | enum `incl` / `excl` NOT NULL | 案件票の表示がどちらだったか。×1.1 は LLM でなく**スクリプト/フォームが計算**する |
| settlementMinH / settlementMaxH | int? / int? | 精算幅の下限・上限（時間） |
| remoteType | enum `full` / `partial` / `onsite` NOT NULL | |
| onsiteNote | text? | 「月4回出社」「初日のみ出社」など実態 |
| startDate | text NOT NULL | `YYYY-MM-DD`。月しか分からなければ `YYYY-MM` |
| endDate | text? | 過去案件の終了月/日 |
| daysPerWeek | text? | 「週5」「週3〜5」 |
| workLocation | text? | |
| supplyChain | text? | 商流（例 `END→エージェント`） |
| paymentSiteDays | int? | 支払いサイト（日） |
| sourceUrl | text? | 案件ページ URL（http/https のみ許可） |
| mustSkills / niceSkills | text JSON string[] NOT NULL default `[]` | |
| **rawText** | text NOT NULL | 案件票の原文をそのまま |
| status | enum（§C）NOT NULL default `saved` | |
| nextAction | text? | 次の一手 |
| nextActionDue | text? | 期日 `YYYY-MM-DD` |
| fitScores | text JSON int[]? | 設定 `axes` に対応する 0〜2。比較ビューで ○△× |
| actualMonthlyIncl | int? | 過去案件の実単価・税込（分かるものだけ） |
| note | text? | 判断メモ |
| createdAt / updatedAt | text | |

index: `cases_status_idx(status)`・`cases_due_idx(next_action_due)`・`cases_source_url_unique(source_url)`（NULL は重複可）

### `case_log`（経緯。「応募済み（日付）」「商談（日時）」の置き場）

| 列 | 型 | 備考 |
|---|---|---|
| id | text PK | |
| caseId | text FK → cases.id ON DELETE CASCADE | |
| at | text NOT NULL | ISO-8601 日時（JST 表示は lib で） |
| kind | enum `status` / `memo` / `import` NOT NULL | |
| fromStatus / toStatus | text? / text? | kind=status のとき |
| body | text NOT NULL default `''` | メモ本文 / 取込元の要約 |
| createdAt | text | |

index: `case_log_case_idx(case_id, at)`

### `settings`（key / value / updatedAt）

- `axes`: 比較の軸ラベル JSON string[]（例 3 本。**中身は D1 にだけ置く**）
- `thresholds`: JSON `{ minMonthlyIncl, minHourlyExcl, targetStart (YYYY-MM), maxOnsitePerMonth }`。比較ビューがこれで下回りセルを赤くする

**判断基準はコードに書かない。** public リポジトリに手の内が出ないための構造で、README にも書かない。

### 派生値（`src/lib/rate.ts` 純粋関数）

- 税抜 = `Math.round(incl / 1.1)`
- 基準時間 = 精算幅が両方あれば中点、片方なら その値、無ければ経路既定 `{ findy: 160, levtech: 168, direct: 160, other: 160 }`
- 時給（税抜） = 税抜 ÷ 基準時間。画面には「÷160h」と根拠を併記
- 税込化 = `sourceTaxBasis === 'excl' ? Math.round(v * 1.1) : v`

## §C ステータス

進行（一方向）: `saved` → `applied` → `screening` → `meeting` → `offer` → `joined` → `ended`
別枠: `declined`（自分が辞退）／ `rejected`（先方が見送り）／ `onhold`（保留）

遷移ルール（`src/lib/status.ts` の `canTransition(from, to)` でテスト）:
- 進行は**後ろにだけ**進める。飛ばすのは可（直請けで書類選考が無い等）
- 別枠へはどこからでも
- `onhold` からは進行のどの状態へも戻れる
- `declined` / `rejected` は終端。UI は確認ダイアログを挟む
- 「進行中」= `saved`〜`offer`、「参画・終了」= `joined`・`ended`、「辞退・見送り」= `declined`・`rejected`

## §D 入力経路

```
「この案件票を登録して」＋ペースト
  → Claude Code が JSON を scratchpad に書く（契約は AGENTS.md「案件票の登録」に明記）
  → npm run add-case -- --file=<json> --remote [--dry-run] [--update=<id>]
      = node --experimental-strip-types scripts/add-case.ts
      ① src/lib/caseInput.ts の zod（アプリの /import と同じ 1 本）で検証
      ② sourceTaxBasis が excl なら ×1.1 して税込に正規化
      ③ wrangler d1 execute --json で重複照会（sourceUrl 一致 or company+title 一致）→ あれば中断。--update=<id> で上書き
      ④ INSERT（cases 1 行 + case_log kind=import 1 行）を一時 SQL（os.tmpdir）に書き
         wrangler d1 execute freelance-pipeline --remote --file=<tmp>
      ⑤ 一時ファイル削除・id と詳細 URL を表示
```

- 秘密は増えない（wrangler の既存 OAuth のみ）。JSON は scratchpad なのでリポジトリに残らない
- Node 22.14 は `--experimental-strip-types` フラグ必須（CI の Node 24 は既定 ON）。kousan-admin の `import:chizu` と同じ手
- zod は `src/lib/caseInput.ts` に 1 本。`caseInputSchema`（LLM 出力の契約）と `toCaseRow(input)`（税込化・既定値）を分ける。スクリプトからもアプリからも同じ関数
- SQL 文字列化は sumai-log の `scripts/lib/seed.mjs` の `sqlString` 流儀を TS に移す
- アプリ側 `/import`: 同じ JSON を貼るテキストエリア → 同じ zod → プレビュー表 → server function で保存。スマホしか無い場面とスクリプトが壊れたときの逃げ道

### JSON 契約（Claude Code の出力）

```jsonc
{
  "company": "…", "title": "…", "route": "findy",
  "agentName": null,
  "monthlyMax": 1120000, "monthlyMin": null, "taxBasis": "excl",   // 案件票の表示のまま。税込化はコード側
  "settlementMinH": 140, "settlementMaxH": 180,
  "remoteType": "full", "onsiteNote": null,
  "startDate": "2026-10", "daysPerWeek": "週4〜5",
  "workLocation": null, "supplyChain": null, "paymentSiteDays": null,
  "sourceUrl": "https://…",
  "mustSkills": ["…"], "niceSkills": ["…"],
  "rawText": "（原文そのまま）",
  "status": "saved", "nextAction": null, "nextActionDue": null, "note": null
}
```

## §E 画面（モバイルファースト。スマホは下タブ、PC は左ナビ＝sumai-log の AppLayout を流用）

| タブ | ルート | 中身 |
|---|---|---|
| ホーム | `/` | 「期日順」（`nextActionDue` 昇順・期限切れは赤・空なら出さない）／進行中の件数と税込中央値／最近のログ 10 件 |
| 案件 | `/cases` | 既定は進行中を**税込降順**。チップで 進行中／保留／辞退・見送り／参画・終了。PC は表（案件・経路・税抜・税込・時給・リモート・開始・状態・次の一手/期日）、スマホは同じ情報のカード。FAB → `/import` |
| 比較 | `/compare` | 列＝案件（既定は進行中すべて・チェックで絞る）、行＝条件項目（税込/税抜/時給/精算/リモート/出社/開始/週/商流/支払サイト/必須/歓迎/軸）。先頭列固定・横スクロール。`thresholds` を下回るセルを赤、`fitScores` を ○△× |
| 設定 | `/settings` | `thresholds` 4 つ・`axes` ラベル |

詳細 `/cases/$id`: 見出し（企業・案件名・経路・状態バッジ）→ 条件ブロック（税込/税抜/時給/精算/リモート/開始/週）→ スキル → 商流・支払 → **次の一手＋期日（その場で編集）** → **ステータス変更**（Select・終端は確認）→ ログ（時系列＋日付つきメモ追加）→ 原文（折りたたみ）→ 編集（全項目の Drawer フォーム）・削除（確認）。

取込 `/import`: JSON テキストエリア → 検証結果（zod のエラーを項目名で）→ プレビュー表 → 保存。

デザイン: sumai-log の暖色トークンは使わず、中立寒色のパレットにアクセント 1 色（住まいアプリと見分けがつくように）。ダークモード auto。実装時に `frontend-design` で具体化。

## §F 認証・公開・セキュリティ

- Cloudflare Access（Google IdP）を Worker 既定 URL に作る。ポリシー = Emails 本人のみ。セッション 1 ヶ月
- Worker 側でも JWT 検証＋allowlist（fail closed・`ENVIRONMENT` 既定 `production`）。`src/lib/access.ts` と `src/start.ts` のグローバルミドルウェアを sumai-log から流用。CSRF（Origin / Sec-Fetch-Site）・セキュリティヘッダも同じ
- `wrangler.jsonc` `vars`: `ENVIRONMENT`・`ACCESS_TEAM_DOMAIN`・`ACCESS_POLICY_AUD`（非秘密・AUD は gitleaks:allow）。secret: `ACCESS_ALLOWED_EMAILS`。`MEMBERS` は持たない
- `.dev.vars`: `ENVIRONMENT=development`・`DEV_IDENTITY_EMAIL`・`ACCESS_ALLOWED_EMAILS`。Keyway は `keyway pull -e development -f .dev.vars -y`（`keyway run` は wrangler に効かない）
- **public リポジトリの 4 点**: seed/fixture/テストは完全な架空（実企業名ゼロ）／migration は DDL のみ／スクショ・OGP はダミーデータ／README は「フリーランスの案件パイプライン管理」まで。**判断基準の数値・軸名はコードに書かない**
- `check-pii`: gitignore 済みの `*.local.json`（`history.local.json` と add-case JSON の写し `cases.local.json`）から company・title・agentName・rawText を拾い、追跡ファイルと照合（会社種別語を外した中核でも照合）。コミット前に通す
- エラーメッセージ・ログに rawText・企業名・単価を載せない（Workers Observability に流れる）
- CSP: `img-src 'self'`・`connect-src 'self'`・外部スクリプトなし。`robots: noindex, nofollow, noarchive`

## §G 過去案件の取込

- `history.local.json`（gitignore）を Claude Code が一度だけ作る。元データは職務経歴書リポジトリの経歴データ（期間/企業/題名/担当/タグ）とスキルシート xlsx（案件単位）。⚠️ xlsx は本セッションで未読（openpyxl 無し）。取込時に読んで案件単位に分ける
- `scripts/import-history.ts`（同じ strip-types）: slug → `sha256` の決定的 id で `INSERT OR REPLACE`（冪等）。`status` は `ended`（現契約中のものは `joined`）、`rawText` は担当内容の連結、`mustSkills` は tags、`actualMonthlyIncl` は分かるものだけ。`sourceTaxBasis` は `incl`
- 一覧の「参画・終了」チップで見る。比較ビューには既定で含めない

## §H コード構成・段階

約束（sumai-log と同じ）: `src/lib/` は純粋関数のみ（100% ゲート）／副作用は `src/server/`（`createServerFn` の zod は `*.schema.ts` に切り出して直テスト）／DB は `src/db/`／repository は `src/server/repository/<domain>.ts` と実 D1 の worker-test／UI は `src/components/` と `src/routes/`／`scripts/` は `node --test`。

新規 lib: `caseInput.ts`（zod・税込化）・`rate.ts`・`status.ts`・`deadlines.ts`（期日順・期限切れ判定・JST）・`compare.ts`（行列化・閾値判定・○△×）・`caseLog.ts`（ログ行の生成・表示整形）。流用 lib: `access` `csrf` `securityHeaders` `dates` `jst` `format` `emptyToNull` `formError` `ids` `nav`。

段階（1 本の実装計画で順に）:
1. **土台**: sumai-log を複製し R2/地図/写真/YouTube/用語集/MEMBERS を除去 → `schema.ts`・migration 0001 → `wrangler.jsonc`（D1 作成）→ Access アプリ（API）→ Keyway → CI・gitleaks・Workers Builds → `gh repo create --public`
2. **lib 6 本**（TDD・100%）
3. **`add-case` スクリプト**＋ AGENTS.md の JSON 契約＋ `scripts/*.test.ts`
4. **一覧・詳細・ステータス・ログ・ホーム**（repository + server function + 画面）
5. **`/import`**
6. **`/compare`・`/settings`**
7. **`import-history`**・履歴チップ
8. **デプロイ → 実データ投入**（進行中 + 辞退済みを add-case で）→ 元の Markdown を「アプリへ移行済み」の 1 行に → README「所有者の作業」


## §I 検証

- 完了基準: `format:check` `typecheck` `test:coverage`（lib 100%）`test:server` `test:scripts` `build` `check:pii` が green
- 認証: JWT なし／署名不正／allowlist 外／本番での dev 経路 → 403
- 入力: `add-case --dry-run` → 実投入 → 詳細画面で原文がバイト一致／`taxBasis: excl` の ×1.1 が一覧の税込と一致／重複で中断・`--update` で上書き／不正 JSON は項目名つきで拒否
- ステータス: 後戻り拒否・終端の確認ダイアログ・ログに自動行
- 比較: settings の閾値を変えるとハイライトが追随／fitScores 未設定は「—」
- モバイル: iPhone 390×844 で 一覧カード・ステータス更新・メモ追加・比較の横スクロール。1280 でも崩れない
- デプロイ: `wrangler deployments list` の `Created` が最新コミットと一致
