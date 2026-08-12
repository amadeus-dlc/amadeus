# Unit of Work

入力: [`components.md`](../application-design/components.md)、[`component-methods.md`](../application-design/component-methods.md)、[`services.md`](../application-design/services.md)、[`component-dependency.md`](../application-design/component-dependency.md)、[`decisions.md`](../application-design/decisions.md)、[`requirements.md`](../requirements-analysis/requirements.md)。User Stories stage は scope grid で非実行のため、[`unit-of-work-story-map.md`](./unit-of-work-story-map.md) は requirements を delivery story として写像する。

## U1: issue-2833-failure-transition

- **kind:** `library`
- **説明:** #2833 の audit-backed outcome projection と `amadeus-orchestrate.ts` failure selector配線を1つのend-to-end vertical Unitとして実装し、swarm/non-swarm Retry・Skip・Abortをdurableに遷移させる。
- **境界:** event decoding、intent/stage/unit/attempt/batch相関、terminal conflict、Unit Z裁定、selector eligibility、autonomous Abort→`parked`を所有する。consume path、reviewer scope、Stop hook、cleanupは所有しない。
- **成果:** `amadeus-construction-outcome-projection.ts`、`amadeus-orchestrate.ts` のfailure selector/halt/park semantic region、pure transition tests、swarm/non-swarm integration tests、Stop hook不変回帰。
- **デプロイ:** shared / embedded。既存 Amadeus CLI build に同梱され、単独 runtime は持たない。
- **複雑度:** L。
- **数値規模:** production 390–650 LOC、tests 620–990 LOC、合計 1,010–1,640 LOC。
- **制約:** `BOLT_FAILED`、`SWARM_BATON_RETURNED`、Unit pool outcomeを既存event familyでjoinする。新state/Stop hook変更なし。`report --result failed` はexit 0 + error directive。#2834のconsume resolutionを変更しない。

## U2: issue-2834-consume-fanout

- **kind:** `library`
- **説明:** #2834 の effective producer population fan-out、reviewer required-input guard、`amadeus-orchestrate.ts` consume resolution配線を1つのend-to-end vertical Unitとして実装する。
- **境界:** succeeded UnitのN×M concrete path、stable order/dedupe/presence split、7 consumer / 19 edge、reviewer fail-open防止、Unit集合不確定時errorを所有する。failure selector/outcome projection/Stop hookは所有しない。
- **成果:** `amadeus-per-unit-consume-fanout.ts`、`amadeus-reviewer-runtime.ts` guard、`amadeus-orchestrate.ts` consume-resolution semantic region、table/integration tests、`t116`/`t186` regression。
- **デプロイ:** shared / embedded。既存 Amadeus CLI / reviewer runtime に同梱される。
- **複雑度:** L。
- **数値規模:** production 310–540 LOC、tests 550–900 LOC、合計 860–1,440 LOC。
- **制約:** 限定placeholder改訂だけを行い、cancelledは候補外、failed/pending/0 Unitはfail-closed。upstream sensor/Stop hook/#2833 failure selectorを変更しない。

## 既存 infrastructure 再利用棚卸し

| 能力 | 既存面 | 利用 Unit | 新設しないもの |
|---|---|---|---|
| TypeScript runtime / build | Bun、root `package.json` scripts | U1/U2 | runtime、package manager |
| pure / integration tests | `tests/unit/`、`tests/integration/`、`bun test`、`tests/run-tests.ts` | U1/U2 | test framework、CI job |
| workflow evidence | canonical audit shard、Unit pool、既存 event families | U1 | database、event store、新 workflow state |
| stage topology | compiled stage graph / frontmatter | U2 | registry、structured consumes schema |
| reviewer enforcement | `amadeus-reviewer-runtime.ts` | U2 | reviewer service |
| terminal stop | 既存 `parked` directive と Stop hook | U1 | Stop hook branch、continuation budget workaround |
| delivery verification | 既存 Build and Test stage、`lint`、`typecheck`、`test:ci`、`build`、`source-only:check`、coverage/complexity gates | U1/U2 | 横断Unit/PR、bespoke gate、external dependency |

## Unit 共通 Definition of Done

- U1/U2 はそれぞれ公開 seam に failing test を先行追加し Red を実測後、最小実装で Green にする。横断suiteは既存 Build and Test stageで実行し、両Issueを含む第三Unit/PRを作らない。
- 各 Unit は1 Bolt・1 branch・1 PR。工程記録と他 Unit を同一 PR に含めない。
- generated `dist/` / `.codex/` 等を commit せず、正本 `packages/framework/core/` と `tests/` だけを変更する。
- PR 作成後に convergence loop を実行し、merge は leader セッションでのユーザー承認まで行わない。

## 並行編集 ownership

| Surface | Owner | Parallel rule |
|---|---|---|
| outcome module、failure selector/halt/park region、専用test | U1 | consume resolution/reviewer面は編集禁止 |
| fan-out module、reviewer guard、consume resolution region、専用test | U2 | failure selector/halt/park面は編集禁止 |
| shared barrel/export/runner/fixture/coverage台帳 | 必要とするIssue Unit | 同じfile/hunkが必要ならworkerは実装を止めconductorへ報告。PR収束はU1→U2で直列 |

## User-approved Amendment

2026-08-10、旧共有U3の複数Issue単一PR衝突と、5 Unit案の1 Issue複数Unit衝突を順に検出した。ユーザー最終裁定「並行実装＋#2833先行ゲート」により、#2833/#2834を2 vertical Unit・2 PRへ改訂した。実装は同一swarm batch、gate/収束順序はU1→U2とする。self-featureの「Bolt1単独実行」は今回intentに限り並行実装を許すが、walking-skeleton先行承認は維持する。

## Amendment Review

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10

前回BLOCKERは解消された。#2833/#2834はそれぞれ単一end-to-end Unit・Bolt・PRへ統合され、横断acceptance PRも廃止された。2-node/0-edge DAG、semantic region ownership、same-hunk時の停止、U1先行gateにより、並行実装と統合安全性が両立する。U2のrebase/updateは実競合またはbranch protection要求時だけ行う。walking-skeleton例外はintent限定のユーザー承認として明示され、FR/NFR coverage、Unit内TDD、公開component/method contractも維持される。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T14:14:11Z
- **Iteration:** 1
- **Scope decision:** none

依存DAG、canonical kind、要求・Unit coverage、数値LOC、reuse inventory、1 Unit=1 Bolt/PR、U1/U2の並行化、U3のorchestrator単独所有は整合しています。しかし、U4の境界と共通TDD完了条件が同時に満たせず、実装者が規約違反なしにBoltを完了できません。

### Findings

- BLOCKER | unit-of-work.md U4 / Common DoD および dependency U3→U4 — U4はU3後のtests-only Unitでproduction変更禁止なのに全Unit共通DoDがRed→minimum Greenを要求するため同時達成不能。U4を共通Red/Green条件から除外して受入検証Unitとして定義するか、受入テストのRedをU3へ移してU4の役割を再定義すること。
- FOLLOW-UP | U1/U2 deliverables / parallel set — 共有barrel/export、共通fixture、test登録、coverage関連fileの所有または編集禁止境界を明記すること。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T14:15:33Z
- **Iteration:** 2
- **Scope decision:** none

U4をGreen期待の検証専用specとして共通Red/Green条件から明確に分離し、失敗時のfail-closed差し戻しも定義したため、前回のTDD境界矛盾は解消されています。U1/U2/U3/U4の排他的所有面と共有ファイルの単独所有者も明記され、U1/U2の並行実装は安全です。acyclic YAML DAG、canonical kind、全FR/NFR coverage、数値LOC、reuse inventory、1 Unit=1 Bolt/PR、TDD、全consumes参照を含め、開発者が追加の設計判断なしに実装可能です。

### Findings

- None
