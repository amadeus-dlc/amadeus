# Reliability Design — mirror-persistence-propagation

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。availabilityではなく、commit境界の正確な分類、audit at-most-once、outbox収束、偽成功0件を信頼性の中心に置く。

## 内部状態機械

`OperationPreparationResult` と `StateResult` を混在させない。

| 現在状態 | 事象 | 次状態／公開結果 | current transition |
|---|---|---|---:|
| outbox absent | preparation成功 | `ready(snapshot)` | 最大1回 |
| audit pending | append失敗またはcanonical field conflict | `maintenance-blocked(audit-pending)` → `stateFailure(not-started, retryable=true)` | 0回 |
| audit pending | append成功／already-present、clearのrename前failure | `maintenance-blocked(clear-pending)` →同上 | 0回 |
| audit pending | clearのrename成功後directory fsync failure | `maintenance-blocked(clear-unknown)` →同上。outbox有無を断定しない | 0回 |
| audit pending | append成功／already-present、clear成功 | `maintenance-completed` →同上 | 0回 |
| ready | rename前failure | `failed(pre-commit)` → `stateFailure(not-started, retryable=false)` | 1回以下 |
| ready | rename後directory fsync failure | `failed(durability-unknown)` → `stateFailure(outcome-unknown, retryable=false)` | 1回 |
| ready | 許可されたno-write変更なし | `ok(clean)` → business outcome | 1回 |
| ready | state＋outbox commit済み | audit appendの成否にかかわらず `ok(outbox-pending)` → business outcome | 1回 |

maintenanceが成功しても同じinvocationではbusiness successを返さない。callerがcurrent operationを必要とする場合だけ、明示的な次invocationを開始する。

## Commitと回復手順

1. `AtomicStatePort.executeExclusive` がlockを取得し、Mirror state documentをlock下で再読・parseする。lockはこの一覧のreturnまたは例外処理が終わるまで保持し、`finally`で一度だけ解放する。lock capabilityは公開interfaceへ出さない。
2. state内にprior outboxがあればtransaction identityと全正本fieldを照合する。appendを最大1回試み、失敗／conflictならoutboxを保持してreturnする。成功／already-presentなら同じmaintenance passでoutbox clearを最大1回試み、成功・失敗のいずれでもcurrent transitionへ進まずreturnする。
3. outboxがなければportが不変snapshotを引数にpureな `transitionFactory(snapshot)` を同期的に一度だけ呼ぶ。snapshotにはlock／commit capabilityを含めず、factoryからI/Oを実行できない。
4. business state、next revision、完全なoutboxを同じMirror state blockへrender／reparseし、一回のatomic rename＋directory fsyncでcommitする。outboxの別file writeは存在しない。
5. state rename前のfailureはbusiness stateとembedded outboxの両方が旧documentのままなので、auditも含め呼出前bytes不変でreturnする。
6. rename後directory fsync failureは結果を推測せず `durability-unknown` とする。次回はstate内outboxの有無とrevisionから回復を開始する。
7. state＋outbox commit後にaudit appendを最大1回行う。成功／already-present／failureのいずれでもcurrent invocationではoutboxをclearせず、`ok(outbox-pending)` を返す。これによりstate renameとstate renderはそれぞれ最大1回に保つ。
8. 次の明示invocationをmaintenance専用とし、audit一致後にoutbox clearを最大1回試みる。clearのrename前failureは `clear-pending`、rename成功後directory fsync failureは `clear-unknown` とし、後者ではoutboxが残ったか消えたかを断定しない。
9. `clear-unknown` の次回invocationはstateを再読する。outboxがあればaudit完全一致を検証してclearを再試行し、なければmaintenance完了済みとして扱う。
10. process crashがstate rename前ならbusiness stateもoutboxも旧document、rename後ならbusiness stateと完全outboxが同じdocumentに存在する。audit append後にもoutboxを意図的に残すため、次回maintenanceが完全一致検証後にclearできる。

## 冪等性と競合

- auditの `already-present` はtransaction identity、payload digest、revision、operation identity、transition kind、schema versionの完全一致時だけ許可する。
- identity一致・field不一致は破損／衝突としてfail-closedにし、outboxをclearしない。
- `persistBlocked`用exclusive transitionの `unchanged | conflict | invalid` はpre-commit failureへ写像し、conflict再評価を行わない。既存non-exclusive callerの1回再評価は本Unit外である。許可されたnon-exclusive no-opだけが `ok(clean)` になれる。
- retryは同一invocation内0回である。`retryable=true` はcallerが新しいinvocationを明示できることだけを表す。

## Failure injection設計

| 層 | 注入点 | 必須assertion |
|---|---|---|
| preparation | lock、read、parse、pure factory境界 | typed failure、call前bytes一致、公開lock capability 0件、factory内I/O 0件 |
| state commit | render、temp create／write／close／lstat、rename | rename前はbyte不変 |
| durability | directory fsync | `outcome-unknown`、成功禁止 |
| audit | append、already-present mismatch | embedded outbox保持、重複append 0 |
| recovery | revision-invariant clear write／fsync | rename前failureはoutbox保持、rename後fsync failureはoutbox有無の両postconditionを許容し次回再読で収束 |
| crash | rename前、rename後、append後、clear前 | business stateとembedded outboxのatomic同居、証跡喪失0 |
| mapping | 全内部variant | exhaustive public mapping、文字列解析0 |

## Recovery objectives

- RPO: commit済みbusiness stateと同じatomic documentに保持する対応outboxの損失0件
- Recovery bound: 障害解除後のmaintenance invocation最大1回でappendを最大1回、続くclearを最大1回実行する。clearが `durability-unknown` の場合だけ、追加の明示invocationでstateを一度再読して有無に応じて収束する
- Retry bound: 同一invocation内0回
- Verification bound: 各回復後にstate、audit、outbox、call countを再読しpostconditionを確認

backup、failover、circuit breakerはremote／replicated componentがないため非適用である。回復は同じcanonical filesに対する決定的な明示invocationで行う。
