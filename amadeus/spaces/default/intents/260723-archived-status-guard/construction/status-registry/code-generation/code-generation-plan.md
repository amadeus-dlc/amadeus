# Code Generation Plan — status-registry

User Stories はスコープでスキップされているため、各Stepを `requirements.md` のFR/NFRと `unit-of-work.md` のstatus-registry Unitへ直接traceする。テスト戦略はComprehensive。

## Implementation steps

- [x] Step 1: `packages/framework/core/tools/amadeus-lib.ts` のregistry status型を `in-flight | parked | complete | archived` に閉じ、`parseIntentStatus(unknown)` とcontext付きstrict registry readerを実装する。通常runtimeで`closed`・未知値・非文字列・欠落をwrite前に拒否する。（FR-01、FR-02、NFR-02）
- [x] Step 2: workspace lock contextを要求する限定`transitionIntentStatusLocked` capabilityと遷移行列を実装し、既存のcomplete更新を同じ契約へ接続する。任意status setterや互換aliasは追加しない。（FR-02、FR-03、FR-04、NFR-01）
- [x] Step 3: `260713-swarm-driver-migration`だけを対象にしたlegacy reader、decision table、raw JSON status-token locator、target外bytes保存、atomic commit/read-backを実装する。他rowと表現を変えない。（FR-08、NFR-01、NFR-04）
- [x] Step 4: status parser、遷移行列、malformed/unknown/closed入力、診断preview、target欠落・重複・unexpected status、idempotent migrationのunit testsを追加する。各component 10〜15ケースを目安にする。（FR-01、FR-02、FR-08、NFR-02、NFR-03）
- [x] Step 5: migrationのtemp write/fsync/rename/read-back failure、target外bytes不変、100回no-op、10,000-entry O(n) growth、p95/RSS benchmarkをintegration testsへ追加する。（FR-08、NFR-01、NFR-03）
- [x] Step 6: repository corpusでregistry status writerが限定transition/strict parserを迂回していないことを検査し、既存status reader/writer callsiteを新契約へ更新する。（FR-02、NFR-03）
- [x] Step 7: coreから6 harness配布物とself-install面を既存generatorで再生成し、drift 0、禁止`closed` runtime pattern 0を確認する。（NFR-04）
- [x] Step 8: `bun install --frozen-lockfile` 後、既存test configurationのまま `bun run typecheck`、Biome lint、対象unit/integration test、`bun run test:ci`、coverage、dist/self-install driftを実行し、plan checkboxとcode summaryを実測結果で更新する。（全要件）

## Expected workspace changes

- Primary implementation: `packages/framework/core/tools/amadeus-lib.ts`
- Existing callers as required: `packages/framework/core/tools/amadeus-state.ts` ほかstatus read/write callsite
- Tests: `tests/unit/` と `tests/integration/` の新規または既存status-registry test
- Generated distribution: 既存generatorが所有する6 harness面とself-install面
- Record artifacts: 本planと `code-summary.md`

## Non-goals

- archive/unarchive transaction本体、selector/next/unpark guard、database、network service、新CI job、新runtime dependencyはこのUnitで実装しない。

## Plan approval

- [x] A. この計画を承認する（推奨）
- [ ] B. 実装Stepを変更する
- [ ] C. テスト範囲を変更する
- [ ] D. 配布・移行手順を変更する
- [ ] X. その他

[Answer]: A
[Rationale]: 推奨選択として承認
[Respondent]: user
[Timestamp]: 2026-07-23T10:32:06Z

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T10:49:49Z
- **Iteration:** 1
- **Scope decision:** approved — STATUS-REGISTRY-PRIMARY-1 — packages/framework/core/tools/amadeus-lib.ts — reason: strict parser、lock capability、transition matrix、migration scanner、atomic writerの責務分離と保守性を検証するため — owner: amadeus/spaces/default/intents/260723-archived-status-guard/construction/status-registry/functional-design/business-logic-model.md#Integration spot-check `STATUS-REGISTRY-PRIMARY-1`: 正本実装は `packages/framework/core/tools/amadeus-lib.ts`。

計画必須のfull test:ciとNFR benchmarkが未完了で、spot-checkではpath boundary、callback-scoped token、atomic writer durabilityの3安全境界が未実装。

### Findings

- BLOCKER CODEGEN-001 — final生成状態でfull test:ciを完走する。
- MAJOR CODEGEN-002 — p95/RSS/growth/provenance benchmarkを実測する。
- BLOCKER CODEGEN-SPOT-001 — migration writeをRegistryPathBoundaryへ接続する。
- MAJOR CODEGEN-SPOT-002 — callback-scoped lock token identity/失効を実装する。
- MAJOR CODEGEN-SPOT-003 — unique temp、parent directory fsync、cleanup/failure testsを実装する。
- INFO CODEGEN-SPOT-004 — 局所的巨大関数・条件スパゲッティなし。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T11:11:58Z
- **Iteration:** 2
- **Scope decision:** approved — STATUS-REGISTRY-PRIMARY-1 — packages/framework/core/tools/amadeus-lib.ts — reason: iteration 1のpath boundary、callback-scoped token、atomic durability修正を検証するため — owner: amadeus/spaces/default/intents/260723-archived-status-guard/construction/status-registry/functional-design/business-logic-model.md#Integration spot-check `STATUS-REGISTRY-PRIMARY-1`: 正本実装は `packages/framework/core/tools/amadeus-lib.ts`。

Iteration 1の未解決事項は全解消。full CI 465 files・6687 assertions・失敗0、性能100標本、path boundary、callback token、atomic durabilityが設計と整合。

### Findings

- RESOLVED CODEGEN-001 — full test:ci PASS。
- RESOLVED CODEGEN-002 — p95/RSS/growth/provenance合格。
- RESOLVED SPOT-001 — canonical path boundary。
- RESOLVED SPOT-002 — callback-scoped token expiry。
- RESOLVED SPOT-003 — unique temp+file/dir fsync+cleanup。
- INFO SPOT-004 — 巨大関数・条件スパゲッティなし。
