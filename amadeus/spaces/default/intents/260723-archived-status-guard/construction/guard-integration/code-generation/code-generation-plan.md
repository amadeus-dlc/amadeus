# Code Generation Plan — guard-integration

User Stories はスキップされているため、各Stepを `requirements.md` のFR/NFRと `unit-of-work.md` のguard-integration Unitへ直接traceする。テスト戦略はComprehensive。

## Implementation steps

- [x] Step 1: 共通`ArchivedIntentGuard`とtyped `intent-not-found` / `intent-archived` rejection、実行可能なunarchive recovery commandを実装する。（FR-05〜FR-07、NFR-02）
- [x] Step 2: `packages/framework/core/tools/amadeus-utility.ts` のintent selectorをlifecycle preflight・strict snapshot・共通guardへ接続し、archived cursor設定とforce/implicit bypassを拒否する。（FR-05）
- [x] Step 3: utilityの`intent archive/unarchive`を、selector lock解放後のstate subprocessへ委譲する。resolved dirNameだけを渡し、stdout/stderr/exit/signalを透過する。（FR-03〜FR-05）
- [x] Step 4: `packages/framework/core/tools/amadeus-orchestrate.ts` の`next`をstage resolution前にarchived stale cursor guardへ接続し、`kind:error`を一度だけ返して即returnする。（FR-06）
- [x] Step 5: `packages/framework/core/tools/amadeus-state.ts` の`unpark`をmarker/status mutation前の共通guardへ接続し、archived+parked/unparkedをnon-zero拒否する。（FR-07）
- [x] Step 6: selector入力形態、stale cursor next、unpark2形態、utility→state TOCTOU、child failure/stream透過、post-recovery baselineのunit/integration testsを各component 10〜15ケース規模で追加する。（NFR-01〜NFR-03）
- [x] Step 7: TypeScript AST/symbol graph corpus analyzerでcursor writer、directive開始点、marker writer、status writerを抽出し、dynamic/未解決/未分類pathをfail closedにする。1x/2x growth、8-process、latency/RSS benchmarkを実装する。（FR-05〜FR-07、NFR-03）
- [x] Step 8: coreから6 harness・4 self-install面を再生成し、typecheck、lint、focused tests、coverage、full `test:ci`、dist/self driftを最終生成状態で完走し、code summaryへ正確な件数/provenanceを記録する。（NFR-04）

## Expected workspace changes

- `packages/framework/core/tools/amadeus-utility.ts`
- `packages/framework/core/tools/amadeus-orchestrate.ts`
- `packages/framework/core/tools/amadeus-state.ts`
- 必要な共通guard/corpus helper
- `tests/unit/`、`tests/integration/` のguard-integration tests
- 既存generatorが所有する6 harness・4 self-install面

## Non-goals

- status永続化・transaction内部の再実装、force option、database、cloud、daemon、external telemetry、新runtime dependency、新CI jobは追加しない。

## Plan approval

- [x] A. この計画を承認する（推奨）
- [ ] B. Guard配線Stepを変更する
- [ ] C. Corpus/benchmark範囲を変更する
- [ ] D. 配布・全体検証を変更する
- [ ] X. その他

[Answer]: A
[Rationale]: 推奨選択として承認
[Respondent]: user
[Timestamp]: 2026-07-23T12:05:30Z

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T12:32:15Z
- **Iteration:** 1
- **Scope decision:** approved — GUARD-INTEGRATION-PRIMARY-1 — packages/framework/core/tools/amadeus-lib.ts — reason: 共通ArchivedIntentGuardのvalidated input shape、preflight依存、typed rejection、adapter境界、公開surfaceと構造的保守性を検証するため — owner: amadeus/spaces/default/intents/260723-archived-status-guard/construction/guard-integration/functional-design/business-logic-model.md#Integration spot-check `GUARD-INTEGRATION-PRIMARY-1`: 共通guard正本は `packages/framework/core/tools/amadeus-lib.ts`。

CI/配布/lockは整合するが、AST/growth/入口別benchmark証跡不足とraw string identity guard境界が未解決。

### Findings

- MAJOR GUARD-001 — AST 1x/2x sink内訳、未解決件数、time/RSS倍率を記録。
- MINOR GUARD-002 — 入口別pairwise p95/RSS/correctnessを記録。
- MAJOR GUARD-SPOT-001 — branded validated identityと安全quoteを実装。
- RESOLVED GUARD-SPOT-002 — typed rejection/adapter分離。
- INFO GUARD-SPOT-003 — 構造品質良好。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T12:36:51Z
- **Iteration:** 2
- **Scope decision:** approved — GUARD-INTEGRATION-PRIMARY-1 — packages/framework/core/tools/amadeus-lib.ts — reason: branded validated identity、preflight resolver、safe recovery quoting修正を検証するため — owner: amadeus/spaces/default/intents/260723-archived-status-guard/construction/guard-integration/functional-design/business-logic-model.md#Integration spot-check `GUARD-INTEGRATION-PRIMARY-1`: 共通guard正本は `packages/framework/core/tools/amadeus-lib.ts`。

AST/growthと入口別benchmarkは解消。raw unsafe string拒否とsafe quoteも改善したが、identity factoryがpreflight外で任意safe stringをbrand化できる。

### Findings

- RESOLVED GUARD-001 — AST 1x/2x metrics。
- RESOLVED GUARD-002 — 入口別100 pair metrics。
- MAJOR GUARD-SPOT-001 — factory非公開化しactive context+validated entryから不可分identity/statusを返す。
- RESOLVED GUARD-SPOT-002 — raw unsafe拒否とsafe quote。
- INFO GUARD-SPOT-003 — 構造品質良好。
