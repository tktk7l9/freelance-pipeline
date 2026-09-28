# freelance-pipeline — Instructions for agents

A case (project) pipeline tracker used by one person. **The repository is public**; the data lives only in D1.

## Hard rules

1. **Never commit real data.** Do not write company names, case names, rates, agent names, raw case-sheet text, or
   emails in code / tests / seed / comments / docs / screenshots. Tests use fictitious values such as `甲社` `テスト案件`
   `owner@example.com`. Run `npm run check:pii` before committing (its sources are the gitignored
   `.dev.vars` and `*.local.json`).
2. **Never write decision criteria in code.** Minimum rate, minimum hourly rate, desired start month, on-site cap, and the
   names of the comparison axes are entered from the UI into D1 `settings`. Not in the README either.
3. **Never add a path that can bypass authentication.** The decision is centralized in `src/lib/access.ts` and applied to
   every request by the global middleware in `src/start.ts`. Fail closed.
4. **Secrets live only in `.dev.vars` (local) and `wrangler secret` (production).** Never put emails in `vars` of
   `wrangler.jsonc`. Keyway: `keyway pull -e development -f .dev.vars -y`.
5. **`src/lib/` holds pure functions only.** It is subject to the 100% coverage gate. The libs read by scripts
   (`enums` `status` `rate` `caseInput`) use the `.ts` extension on imports within lib.
6. **Never put raw text, company names, or rates in error messages or logs** (they flow into Workers Observability).

## Design conventions

- Side effects go in `src/server/`, the DB in `src/db/`, UI in `src/components/` and `src/routes/`
- D1 access goes in `src/server/repository/<domain>.ts`. Server-function zod schemas are split out into
  `src/server/cases.schema.ts` (the `createServerFn` wrapper cannot be imported from plain workers tests)
- Tax-included rates are canonical (`monthlyMaxIncl`). Only `toIncl` in `src/lib/rate.ts` converts tax-excluded → tax-included
- `createdAt`/`updatedAt` are both `sql\`(datetime('now'))\``. Do not mix in ISO strings
- Dates are ISO-8601 TEXT, amounts are integer yen, ids are text (`crypto.randomUUID()`)
- Mobile first. Bottom tabs + FAB + full-screen Drawer. Left nav on desktop

## Income/expense ledger (/income)

- The `ledger` table holds both income (freelance revenue, officer compensation, other) and expenses (income tax, resident tax,
  consumption tax, social insurance, business expenses, other), split by `kind`. Amounts are integer yen; revenue stays tax included.
  Aggregation is in `src/lib/ledger.ts` (pure functions).
- Never write real data (amounts, payers) in code, seed, or tests. The owner runs the initial load as SQL with `--remote`.

## Registering a case sheet (from Claude Code)

On "register this case sheet" + a paste, do the following.

1. Read the case sheet and write JSON matching `caseInputSchema` in `src/lib/caseInput.ts` to the **scratchpad** (outside the repo).
   See `CASE_JSON_EXAMPLE` (same file) for an example. Enter amounts **exactly as shown on the case sheet** and declare
   `incl` (shown tax included) / `excl` (shown tax excluded) in `taxBasis`. Do not compute ×1.1 yourself.
   If the company's official site is known, put it in the optional `companyUrl` (it goes into the `companies` table, one row per
   company, and links every place the company name is displayed)
2. Put the case sheet's raw text in `rawText` as is (do not summarize)
3. `npm run add-case -- --file=<json> --remote --dry-run` → once validation passes, run again without `--dry-run`
4. If it says "同じ案件が既にあります" (the same case already exists), check the id shown; to overwrite, use `--update=<id>`.
   `--update` rewrites only the case-sheet columns (status, next step, due date, axes, and memo are kept, and an
   import row is added to the history)
5. Share the resulting URL. Do not paste the JSON or raw text back into the conversation

Mixing up tax-excluded and tax-included has caused real damage before. Always decide `taxBasis` from the case sheet's notation.

## After changing the schema

```bash
npm run db:generate
npm run db:migrate:local
npm run cf-typegen
```

## Definition of done

`npm run format:check` `typecheck` `test:coverage` `test:server` `test:scripts` `build` `check:pii` are all green.
If you touch authentication, confirm 403 on the deny paths (no JWT / invalid signature / not in allowlist / dev path in production).

## References

Spec: `docs/superpowers/specs/2026-09-16-freelance-pipeline-design.md`
