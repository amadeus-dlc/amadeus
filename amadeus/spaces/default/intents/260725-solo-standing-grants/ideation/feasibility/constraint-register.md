# Constraint Register: Solo Standing Grant

## Mandatory Constraints

| ID | Constraint | Source | Verification |
|---|---|---|---|
| C-01 | Standing grantは設定modelではなくaudit eventとして保持する | User / Issue #1466 | `GRANT_ISSUED`・`GRANT_REVOKED`契約test |
| C-02 | team modeのleader/delegation経路を変更しない | User | 現行team integration testの非回帰 |
| C-03 | solo modeでteam delegationを流用しない | User / topology | solo routeに`DELEGATED_APPROVAL`を要求しないtest |
| C-04 | `HUMAN_TURN`要件を弱めず、有効grantを別の認可根拠として追加する | User | fresh turn・grant・neitherの3分岐test |
| C-05 | gateの有無と認可主体を別概念として扱う | User | directive schema test |
| C-06 | standing grant専用の擬似gate値を導入しない | User | directive union drift test |
| C-07 | route時に選んだGrant Idを明示搬送し、commit時に同一idを再検証する | User | route/commit race integration test |
| C-08 | 失効・取消・対象外はhuman gateへ戻し、errorにしない | User | audit absenceとdirective fallback test |
| C-09 | fallback時に`STAGE_COMPLETED`・`ERROR_LOGGED`を発行しない | User | audit exact-count test |
| C-10 | phase-boundaryとwalking-skeletonの現行規則を維持する | User | existing + solo exclusion test |
| C-11 | per-unitは全unit完了後の最終gateだけを候補化する | User | coverage-ledger integration test |
| C-12 | 全ハーネスのconductor手順を同義にする | User | distribution/promote drift check |
| C-13 | 設計承認前に実装しない | User | workflow gate |

## Existing-System Constraints

| ID | Existing constraint | Consequence |
|---|---|---|
| E-01 | `findActiveStandingGrant`はactive space全intentを走査する | solo用resolverはtarget intentを明示的に限定する必要がある |
| E-02 | `approve`はstate tool内でgrantを暗黙探索する | route選択idを受け取るcommit contractが必要 |
| E-03 | orchestratorのerror directiveは`ERROR_LOGGED`を記録する | grant競合を通常error経路へ送れない |
| E-04 | `approveUnderLock`がartifact検証からadvanceまでを所有する | commit時再検証は同じlock内でapproval auditより前に行う |
| E-05 | `standingGrantSatisfiesGate`がphase/skeleton規則の正本である | routeとcommitで同一predicateを共有する |
| E-06 | per-unit engineはartifact coverageをledgerとして最終gateを一度だけ出す | authorization selectionはall-covered re-entryより前に動かさない |
| E-07 | framework coreから各harnessとdistへ生成・同期する |投影先を個別設計にしない |

## Operational Constraints

- 既存TypeScript/Bun toolchain内で完結する。
- 外部network、AWS account、database migration、secret追加は不要。
- PR #1468のbranchまたはcommitをmerge/cherry-pickしない。
- 最新mainから作成した`codex/solo-standing-grants`上でintent成果物を正本とする。
- 型check、関連test、全test、lint相当、生成物drift checkを完了条件とする。

## Compliance and Audit Constraints

- issuer provenanceは物理的に存在する`HUMAN_TURN`へ接地する。
- grantのmalformed、expiry、revocation、target mismatchはfail-closedに扱う。
- `GATE_APPROVED`のGrant Idはroute時候補ではなくcommit時検証済みidである。
- approval成功時のevent順序とatomicityを維持する。
- fallbackは拒否やsystem errorではなく、未承認gateが残る通常状態である。
- reject、Request Changes、halt-and-ask、不可逆external actionはgrant対象にしない。

## Constraint Resolution Status

| Status | Count | Meaning |
|---|---:|---|
| Accepted | 20 | intentと現行コードから確定 |
| Design pending | 4 | carrier型、typed fallback、target field互換性、predicate責務 |
| Blocked | 0 | 現時点で実現不能な制約なし |

## Upstream Traceability

このregisterは`../intent-capture/intent-statement.md`の非交渉境界とSuccess Metricsを具体的な検証制約へ展開した。optional market-research成果物はSKIPされており参照していない。
