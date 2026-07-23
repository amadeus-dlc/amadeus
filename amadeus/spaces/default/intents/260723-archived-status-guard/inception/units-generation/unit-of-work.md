# Unit of Work — archived intent lifecycle

上流入力: `components`、`component-methods`、`services`、`component-dependency`、`decisions`、`requirements`。User Storiesはスキップ済みのため、Unit coverageはFR/NFRへ直接traceする。

## Unit: status-registry

- 目的: 4値`IntentStatus`、strict runtime validator、限定transition capability、`closed`一件移行を提供する。
- 所有: `amadeus-lib.ts`の`IntentStatus`、`parseIntentStatus`、通常runtimeのstrict registry read/write、migration専用raw decoder、関連unit/integration tests。
- 境界: archive/unarchive orchestration、selector/next/unpark guardは所有しない。
- 配布: framework coreと6 harness生成物へ同一releaseで反映。
- 相対複雑度: M。規模見積りは実装180〜280行、tests180〜300行、合計360〜580行。
- 完了条件: 通常runtimeで不正status拒否、対象migration decision table全分岐、他row bytes不変、dist drift 0。

## Unit: lifecycle-transaction

- 目的: archive/unarchive、opaque locked capability、journal recovery、idempotent lifecycle audit、HUMAN_TURN横断消費を提供する。
- 所有: `amadeus-state.ts`の`handleArchive`/`handleUnarchive`、`amadeus-lib.ts`の`withIntentLifecyclePreflight`、locked transition/recovery/journal helper、`amadeus-audit.ts`のlocked lifecycle event append。
- 境界: selector UXと`next`/`unpark` guard配線は所有しない。
- 配布: framework coreと6 harness生成物へ同一releaseで反映。
- 相対複雑度: XL。規模見積りは実装350〜550行、tests450〜700行、合計800〜1,250行。
- 完了条件: 7 failure injection境界、operationId一件性、reader前recovery、human-presence拒否、archive/unarchive成功contractがgreen。

## Unit: guard-integration

- 目的: archived intentのselector、`next`、`unpark`拒否とutility→state委譲、配布・corpus統合を完成させる。
- 所有: `amadeus-utility.ts`のselectorとstate verb委譲、`amadeus-orchestrate.ts`の`archivedNextGuard`、`amadeus-state.ts`の`assertActiveIntentNotArchived(..., "unpark")`配線、packaging/corpus tests。
- 境界: status永続化とtransaction内部はconsumerとしてのみ利用する。
- 配布: 同一framework release。Unit単独deploy/feature flagは行わない。
- 相対複雑度: L。規模見積りは実装180〜300行、tests300〜500行、合計480〜800行。
- 完了条件: cursor設定、stale cursor `next`、unpark、typed error、CLI委譲、dist/self-install同期がgreen。

## Reuse inventory

既存のworkspace lock、atomic file write、audit parser/emitter、human-presence event reader、packaging script、test runnerを再利用する。新しいservice、network、database、CI job、deployment targetは追加しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:39:44Z
- **Iteration:** 1
- **Scope decision:** none

3 Unitの責務は上流コンポーネント境界と整合し、必須YAML DAGは宣言完全・自己参照なし・非循環で、FR-01〜08/NFR-01〜04は全件primary ownerを持つ。2.7はtopologyと並行可能性の記述に留まり、推奨順序・critical path・価値/リスク優先付けを2.8へ漏らしていないため実装可能である。指摘された相対複雑度と共有ファイル内の所有境界は成果物へ反映済み。

### Findings

- MAJOR — unit-of-work.md: 各UnitへS/M/L/XL相対複雑度を追加し、行数レンジを根拠として維持した。
- MINOR — unit-of-work.md: 共有ファイル内のexport/helper/handler単位の所有境界を明記した。
- INFO — unit-of-work-dependency.md: YAMLは非循環DAGで、直接辺はcontract消費と一致する。
- INFO — unit-of-work-story-map.md: FR-01〜08とNFR-01〜04を漏れなく覆い、全Unitにprimary ownerがある。
