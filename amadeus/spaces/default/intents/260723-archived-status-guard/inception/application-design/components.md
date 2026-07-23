# コンポーネント設計 — archived intent lifecycle

上流入力: `requirements`、brownfieldの`architecture`と`component-inventory`、実装規律の`team-practices`。

## コンポーネント境界

| コンポーネント | 所有責務 | 公開面 | 非責務 |
|---|---|---|---|
| Intent Registry Domain (`amadeus-lib.ts`) | `IntentStatus`、validator、registry検索・更新、journal/recovery primitive | 型、parse/lookup/update/recover helper | CLI表示、stage routing |
| Lifecycle Command (`amadeus-state.ts`) | archive/unarchiveの検証・human-presence・transaction orchestration | `archive <dirName>`、`unarchive <dirName>` | selector UX、next routing |
| Intent Selector (`amadeus-utility.ts`) | selector解決とactive cursor設定前のarchived拒否 | `intent <selector>`、必要時のstate verb委譲 | status永続化 |
| Workflow Router (`amadeus-orchestrate.ts`) | stale cursorでもrun-stage前にarchived拒否 | `next` | archive/unarchive実行 |
| Audit Boundary (`amadeus-audit.ts`) | archived sealとlifecycle event例外 | append policy | status変更 |
| Registry Migration (`amadeus-lib.ts` migration path) | `closed`対象1件の一意照合・4値全件検証 | migration helper | 通常runtime遷移 |

新規サービスや新規パッケージは作らない。変更理由が同じregistry型・永続化・復旧知識を`amadeus-lib.ts`へ集約し、既存toolは狭い公開helperだけを利用する。

## Transaction journal

- path: `amadeus/spaces/<space>/intents/.amadeus-intent-status-transaction.json`
- scope: workspace lockあたり最大1件
- fields: schemaVersion、operationId、verb、intentDir、fromStatus、toStatus、humanTurnTimestamp、userInput、auditCommitted、registryCommitted、cursorCommitted
- lifecycle: validate → journal atomic write → audit → registry → cursor → journal完了/削除
- recovery: lock取得直後、registry/cursor/auditを読む前に未完了stepだけを再実行
- corruption: JSON破損、未知schemaVersion、対象intent消失、fromStatus不一致は自動修復せずworkspace操作をfail-closedに停止し、journal pathと不一致内容を診断する
- presence reservation: journal作成時に自shardの最新未消費HUMAN_TURNを選び、shard pathとtimestampをoperationIdへ予約する

recordの`amadeus-state.md`は変更せず、archive前のcheckpointを保存する。

## 共通preflight

registry、cursor、auditを読む公開入口は`withIntentLifecyclePreflight`を通す。このhelperだけがworkspace lockを取得し、lock内版recoveryを実行してからcallbackへ制御を渡す。Lifecycle Command、Intent Selector、Workflow Router、unpark、Audit Boundaryの全callerはこの入口を使い、callback内でlockを再取得しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:18:58Z
- **Iteration:** 1
- **Scope decision:** none

境界は概ね妥当だがlifecycle迂回、監査冪等性、共通preflight、presence消費、移行、ADR比較、破損journal方針が不足。

### Findings

- BLOCKER: 汎用updateIntentStatusがarchived遷移の専用verbを迂回できる。
- BLOCKER: audit commit後journal marker前crashのoperationId冪等性がない。
- BLOCKER: 全readerのrecovery先行経路が設計されていない。
- MAJOR: HUMAN_TURNの予約と一意消費が未設計。
- MAJOR: closedからarchivedへの一件移行設計がない。
- MAJOR: ADRのpros/cons/reversibilityが不足。
- MAJOR: journal破損時のrecovery方針がない。
- MINOR: utilityからstateへのCLI委譲契約が不足。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T07:21:13Z
- **Iteration:** 2
- **Scope decision:** none

方針は改善したがmodule境界、legacy migration、lock委譲、公開wrapperに実装矛盾が残る。

### Findings

- BLOCKER: 非export locked writerを別moduleのstateから呼べない。
- BLOCKER: strict IntentStatus loadではlegacy closedをmigration前に拒否する。
- BLOCKER: utility preflightからstate subprocess委譲するとlock再入、解放するとTOCTOUになる。
- MAJOR: intentStatus/completeIntentStatus公開APIがpreflight契約と矛盾。
- MAJOR: audit idempotent appendのlocked署名が不足。
- MAJOR: HUMAN_TURN一回性のprotected verb横断範囲が未定義。
- MINOR: migration再実行decision tableが不足。
