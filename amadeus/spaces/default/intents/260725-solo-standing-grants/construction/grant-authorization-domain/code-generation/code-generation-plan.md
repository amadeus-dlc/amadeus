# Code Generation Plan: grant-authorization-domain

## Scope

本UnitはU1の純粋な認可ドメインだけを実装する。directive/report/state commit、human fallback、presence reservation、harness投影はU2/U3へ残す。Test StrategyはComprehensiveを維持する。

## Plan

- [x] **Step 1: canonical operating mode resolverを追加する**  
  `packages/framework/core/tools/amadeus-lib.ts`へunset/empty=`solo`、`solo`、`team`、unknown fail-closedのresolverを追加し、grant lifecycleとqueryが同じ判定を使えるようにする。  
  Trace: FR-01–04、FR-19、BR-01–03。

- [x] **Step 2: audit-derived solo grant projectionと完全順序を実装する**  
  active intent binding、valid provenance、未取消、expiry、同一Grant Id issue cardinality exactly-oneを判定し、expiry desc → issued timestamp desc → Grant Id ascでsolo candidateを決めるpure seamを追加する。既存team finderの観測結果は変更しない。  
  Trace: FR-02、FR-05、FR-07、BR-09–14a。

- [x] **Step 3: gate eligibility classifierを確定する**  
  gateなし、phase-boundary opt-in、walking-skeleton on/off/scope-dependent/unknown、`amadeus-feature` effective-on、per-unit final gateをtyped eligible/ineligibleとして評価する。擬似gate値を追加しない。  
  Trace: FR-06、FR-20–22、BR-15–21。

- [x] **Step 4: authorization selection receipt domainとprotected audit schemaを追加する**  
  `GATE_AUTHORIZATION_SELECTED`をprotected eventへ登録し、UUID v4 Route Id、Stage、Grant Idのexact parse/cardinality/field-matchをpure queryとして実装する。append transaction自体はU2が所有する。  
  Trace: FR-08、FR-12、NFR-01–03、BR-22–24。

- [x] **Step 5: standing grant issue/revokeをsoloでも利用可能にする**  
  `packages/framework/core/tools/amadeus-state.ts`のissue/revokeでcanonical resolverを使い、fresh `HUMAN_TURN`、4時間TTL、scope、permissive revoke appendを維持したままsoloを許可する。teamのissuer provenance、stdout/stderr、event fieldは変えない。  
  Trace: FR-01、FR-03–04、FR-19、BR-04–08。

- [x] **Step 6: domain unit/property testsを追加する**  
  新規 `tests/unit/t-solo-standing-grant-domain.test.ts` でmode全値、TTL/expiry境界、malformed audit、intent mismatch、issue cardinality 0/1/複数、全tie-break、gate policy全行、receipt 0/1/複数とfield mismatchを検証する。  
  Trace: U1 delivery scenarios 1、3、4、NFR-02–04。

- [x] **Step 7: lifecycle・protected-event integration testsを拡張する**  
  `tests/integration/t-standing-grant.test.ts`でsolo issue/revoke、team golden、fresh-human guard、protected receipt mint拒否、exact audit fieldsを検証し、audit taxonomy同期testを更新する。  
  Trace: U1 delivery scenario 2、FR-01–05、FR-19、NFR-01、NFR-05。

- [x] **Step 8: focused verificationを実行する**  
  U1 unit/integration tests、audit event sync、typecheck、linter、`git diff --check`を実行する。既存test configurationを利用し、新しいrunner/config/dependencyは追加しない。  
  Trace: NFR-05–08、受け入れ条件5–7、9。

- [x] **Step 9: code summaryを作成する**  
  変更ファイル、実装判断、test結果、計画との差分を`code-summary.md`へ記録する。  
  Trace: Code Generation stage contract。

## Explicit Non-goals

- directive carrierとstrict report wire
- grant-backed approval transactionとhuman fallback
- presence reservation
- generated harness filesの直接編集
- team leader/delegation経路の変更

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T08:28:32Z
- **Iteration:** 1
- **Scope decision:** approved — U1-CODE-DOMAIN-1 — packages/framework/core/tools/amadeus-lib.ts — reason: code-summaryが主張するactive-intent binding、issue cardinality exactly-one、one-pass完全順序、gate policy、space-wide receipt exact lookupの実装形状・相互作用・maintainabilityを、Code Generationレビューとして1ファイルで検証するため — owner: amadeus/spaces/default/intents/260725-solo-standing-grants/construction/grant-authorization-domain/functional-design/business-logic-model.md#Implementation integration `U1-CODE-DOMAIN-1` is owned by `packages/framework/core/tools/amadeus-lib.ts`; the Code Generation reviewer may spot-check this single canonical source against the workflows below.

spot-checkで主要ロジックは確認できたが、registry外directory混入、performance counter未実装、巨大moduleへの責務集中が残る。

### Findings

- BLOCKER: receipt/provenance scanはlistIntentDirsによるfilesystem directory列挙ではなく、検証済みcurrent-space registry rowsを単一列挙元とし、rowから解決したcanonical recordだけを読む必要がある。
- MAJOR: pass別eventVisited/shardOpened、candidateCompared、memoryItemAdded、duplicate canonical shard open検出を持つproduction no-op observerとE/G fixtureが必要。
- MAJOR: pure grant domainとregistry-bound readerを内部module境界または明確なprivate façadeで分離する必要がある。
- CONFIRMED: active cursor binding、exact issue cardinality、one-pass完全順序、typed gate policy、exact receipt parser/mint guard、solo lifecycleは妥当。
- CONFIRMED: full distribution/team最終回帰はU3責務で、U1 focused/type/lint/diff evidenceは妥当。

### Review remediation

- [x] current-space `intents.json` の検証済み・非archived・`dirName`明示rowだけを列挙し、未登録・archived・欠損recordをreceipt/provenance/revocation corpusから除外した。
- [x] pure grant queryとregistry-bound readerを`packages/framework/core/tools/amadeus-grant-authorization.ts`へ分離し、`amadeus-lib.ts`からの一方向importだけにした。
- [x] production既定no-opのpass別observerを追加し、`shardOpened`、`eventVisited`、`candidateCompared`、`memoryItemAdded`と同一pass内canonical shard重複openを検証した。永続metricsは追加していない。
- [x] G系列`0/1/10/100`、E系列`0/1/25`、team dispatch spy、100 intents・100,000 events・5秒上限のblocking testを追加した。
- [x] focused suite、typecheck、変更ファイルlint、repository lint、`git diff --check`を再実行した。harness再生成は行っていない。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T08:42:53Z
- **Iteration:** 2
- **Scope decision:** approved — U1-CODE-DOMAIN-2 — packages/framework/core/tools/amadeus-grant-authorization.ts — reason: registry-bound intent enumeration、performance observer、pure domain/reader module boundary、receipt exact lookupを最終確認するため — owner: amadeus/spaces/default/intents/260725-solo-standing-grants/construction/grant-authorization-domain/functional-design/business-logic-model.md#Implementation integration `U1-CODE-DOMAIN-2` is owned by `packages/framework/core/tools/amadeus-grant-authorization.ts`; the Code Generation reviewer may spot-check this registry-bound domain module against the workflows below.

前回3指摘は解消された。registry-bound module、pass別observer、責務分離、focused/performance/team evidenceはU1完了条件を満たす。

### Findings

- RESOLVED: current-space intents.jsonを正本とし、archived/dirName欠落/不正/重複rowを除外または拒否し、未登録directoryを混入させない。
- RESOLVED: production no-op observerでpass別shardOpened/eventVisited/candidateCompared/memoryItemAddedとcanonical shard重複を検証し、100 intents/100,000 eventsが上限内。
- RESOLVED: registry reader、projection、validation、selector、receipt resolverをamadeus-grant-authorization.tsへ分離し、一方向依存を維持。
- CONFIRMED: active intent binding、exact issue cardinality、完全順序、provenance/revocation/gate eligibility、exact receiptを実装。
- CONFIRMED: team focused baselineはPASS、全harness/full distributionはU3責務。
