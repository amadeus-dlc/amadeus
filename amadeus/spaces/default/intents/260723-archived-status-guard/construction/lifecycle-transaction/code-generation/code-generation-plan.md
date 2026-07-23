# Code Generation Plan — lifecycle-transaction

User Stories はスキップされているため、各Stepを `requirements.md` のFR/NFRと `unit-of-work.md` のlifecycle-transaction Unitへ直接traceする。テスト戦略はComprehensive。

## Implementation steps

- [x] Step 1: `packages/framework/core/tools/amadeus-lib.ts` にworkspace lock callback内だけ有効なlifecycle preflight、strict journal schema、`FFF/TFF/TTF/TTT` recovery state machineを実装する。（FR-03、FR-04、NFR-01）
- [x] Step 2: operationId、verb/from/to、予約HUMAN_TURN shard/timestamp、userInput、step flagsを保持するcrash-durable JournalStoreを実装する。temp/file/parent directory fsyncとcleanupを既存atomic contractへ揃える。（FR-03、FR-04、NFR-01）
- [x] Step 3: `packages/framework/core/tools/amadeus-audit.ts` または既存audit境界へ、operationId検索、同一shard append、immutable payload完全照合、event正確1件のlocked lifecycle commitを実装する。（FR-03、FR-04、NFR-01）
- [x] Step 4: `packages/framework/core/tools/amadeus-state.ts` に`archive`/`unarchive` verbを実装し、status-registryの限定transition、active archive時cursor clear、unarchive cursor no-op、human-presence消費を一つのpreflight callbackで順序制御する。（FR-03、FR-04）
- [x] Step 5: journal schema/topology、lock token失効、HUMAN_TURN欠如・timestamp重複、from/to行列、audit payload mismatch、operationId重複のunit testsを各component 10〜15ケース規模で追加する。（FR-03、FR-04、NFR-02、NFR-03）
- [x] Step 6: 7 failure境界のdurable write前・write後flag前・flag後subcase、`FFF` active archive recovery、journal削除失敗、archive3遷移元、unarchive、active/non-active cursorをintegration testsで検証する。（NFR-01、NFR-03）
- [x] Step 7: 8別intent/別turnの並行成功、同一intent競合の成功1・拒否7、5秒lock timeout、500/750ms p95、96MiB RSS、100回収束をbenchmark/integration testsへ実装する。（NFR-01、NFR-03）
- [x] Step 8: coreから6 harnessと4 self-install面を再生成し、`bun run typecheck`、lint、対象tests、full `bun run test:ci`、dist/self driftを最終生成状態で完走し、code summaryへ正確な件数とprovenanceを記録する。（NFR-04）

## Expected workspace changes

- `packages/framework/core/tools/amadeus-lib.ts`
- `packages/framework/core/tools/amadeus-audit.ts`
- `packages/framework/core/tools/amadeus-state.ts`
- `tests/unit/`、`tests/integration/` のlifecycle transaction tests
- 既存generatorが所有する6 harness・4 self-install面

## Non-goals

- selector/next/unpark guard配線、force option、database、distributed lock、external telemetry、新runtime dependency、新CI jobはこのUnitで実装しない。

## Plan approval

- [x] A. この計画を承認する（推奨）
- [ ] B. Transaction/Journaling Stepを変更する
- [ ] C. Failure injection・並行テスト範囲を変更する
- [ ] D. 配布・全体検証を変更する
- [ ] X. その他

[Answer]: A
[Rationale]: 推奨選択として承認
[Respondent]: user
[Timestamp]: 2026-07-23T11:19:13Z

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T11:54:43Z
- **Iteration:** 1
- **Scope decision:** approved — LIFECYCLE-TRANSACTION-PRIMARY-1 — packages/framework/core/tools/amadeus-lib.ts — reason: journal state machine、callback-scoped lifecycle capability、forward recovery、operation ID一件性、責務分離と保守性を検証するため — owner: amadeus/spaces/default/intents/260723-archived-status-guard/construction/lifecycle-transaction/functional-design/business-logic-model.md#Integration spot-check `LIFECYCLE-TRANSACTION-PRIMARY-1`: 正本実装は `packages/framework/core/tools/amadeus-lib.ts`。

journal state machine、callback capability、forward recovery、operationId一件性は設計どおりで、巨大関数や条件分岐スパゲッティなし。

### Findings

- RESOLVED — journal topology FFF/TFF/TTF/TTT。
- RESOLVED — callback capability lifetime。
- RESOLVED — forward recovery idempotency。
- RESOLVED — operationId一件性。
- INFO — 責務分離良好。
