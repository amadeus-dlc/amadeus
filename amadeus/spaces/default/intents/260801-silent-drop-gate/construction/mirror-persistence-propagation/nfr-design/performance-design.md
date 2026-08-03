# Performance Design — mirror-persistence-propagation

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。対象はBun 1.3.13上の短命な同期CLIとローカルfilesystemだけであり、cache、connection pool、CDN、非同期queue、常駐workerは導入しない。

## クリティカルパス

`persistBlocked` は次の二つの排他的経路だけを持つ。

1. **maintenance経路**: `prepareOperation` がprior outboxを検出し、一回のmaintenance passでappendを最大1回、成功／already-present時のclearを最大1回実行して `maintenance-blocked | maintenance-completed` を返す。このinvocationではcurrent transitionを構築しない。
2. **current transition経路**: exclusive lock内でoutbox absentを確認したsnapshotから`persistBlocked`用exclusive transitionを一度だけ構築し、`applyTransition` を一度だけ呼ぶ。state＋embedded outboxを一回のatomic writeでcommitし、audit append後もoutboxを保持してreturnする。clearは次のmaintenance invocationだけが所有する。

両経路を同一invocationで連結しないため、prior maintenanceのI/O量がcurrent transitionの評価回数を増幅しない。

## コンポーネント別予算

| コンポーネント | 構造的上限 | 禁止事項 |
|---|---:|---|
| `OperationPreparationCoordinator` | invocationあたり1回 | drain後の暗黙再入、再帰 |
| `PriorOutboxMaintainer` | maintenance passあたりappend／already-present確認最大1回、embedded outbox clear用state rename最大1回 | 同じphaseのretry、current transitionへの続行 |
| `TransitionEvaluator` | `ready`時の`persistBlocked` exclusive pathだけ最大1回 | conflict時の再評価、maintenance結果からの呼出し |
| `AtomicStatePort` | current transitionのrename最大1回 | warning success、fallback write |
| `AuditOutboxCoordinator` | transaction identityごとの新規append最大1件 | payload不一致の冪等扱い |
| `PublicResultMapper` | 完成済み内部Resultの単一投影 | summary／例外message再parse |

## メモリ・I/O設計

- business stateとoutboxは同じMirror state blockの一つのsnapshotが所有し、同じatomic renameでcommitする。auditだけが別fileであり、同じbytesの独立copyを段階ごとに作らない。
- parse、digest、renderは入力bytesに対して各1回を基本とし、failure classificationのための再serializationを行わない。
- filesystem portは同期APIを維持する。worker thread化や並列I/Oは決定性とfailure順序を複雑化するため採用しない。
- external process、network、credentialを追加しない。AWSサービスへのmappingは非適用である。

## 測定設計

focused failure-injection suiteは同一revisionで5回実行し、各回について次を記録する。

- lock acquire／release、`prepareOperation`、`applyTransition`、state rename、audit append、embedded outbox clearのcall count
- failure injection pointと内部Result variant
- state／audit／outboxのbefore／after digest
- 実行時間、Bun version、full revision、retry count

合格条件は `performance-requirements.md` のPERF-MPP-01〜05をそのまま使う。実時間が遅い場合もcall上限、byte不変、typed failureを緩めず、I/O区間の計測から原因を特定する。

## 実装境界

性能計測はtest adapterだけが所有し、production domainへcounterやclockを持ち込まない。production portを薄く保ち、testでは同じportを計測decoratorで包む。`persistBlocked`はexclusive transitionであるためconflictを即時pre-commit failureにし、既存non-exclusive callerの1回再評価は本Unitのcall-countへ含めない。これにより性能証跡のためにruntimeの公開unionや永続化順序を変更しない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T08:01:26Z
- **Iteration:** 1
- **Scope decision:** none

主要な失敗分類とmaintenance-only境界は整理されているが、単一invocationの評価上限、複数file間のクラッシュ整合性、lockの所有期間、outbox maintenanceの遷移規則が一意に実装できない。特にRPO 0とaudit完全性は、現在記載された3file構成だけでは保証できない。

### Findings

- business-logic-model.md はnon-exclusiveな初回transition-conflictを1回再評価とする一方、performance-requirements.mdとperformance-design.mdはapplyTransitionをinvocationあたり最大1回、retryを0回としている。conflict時に二度目の評価を許すのか、pre-commit failureへ終端するのかを統一しない限り、call-count acceptanceを実装できない。
- state、audit、outboxを独立した3fileとして扱いながら、commit済みstateにはauditまたは完全なoutboxが必ず存在、対応outboxの損失0件というRPOを保証するdurable write順序とクラッシュ回復プロトコルがない。state rename後・outbox永続化前の停止では証跡を失い、outbox先行後・state rename前の停止では未commit transitionをauditへ流す可能性がある。各fileのwrite／rename／directory fsync順序、commit marker、起動時のstate revision照合を含むプロトコルが必要である。
- prepare(operation)がready(snapshot)を返してからTransitionEvaluator.applyを呼ぶ構造に対し、lockの所有者、保持期間、解放点、lock付きsnapshotを表すhandleが定義されていない。prepare後にlockを解放すると、並行CLI invocationが双方outbox absentを観測し、同じsnapshotからtransitionをcommitできる。readからstate／audit／outbox収束までを覆うtransaction境界か、並行実行を排除できる明示的根拠が必要である。
- maintenanceの原子ステップが成果物間で一致しない。reliability-design.mdの回復手順とscalability-design.mdはappendまたはclearを一段だけ実行してreturnするとする一方、business-logic-model.mdはappend成功後に同一invocationでclearまで試み、reliability-design.mdの状態表にもappend成功後clear失敗経路がある。append成功時に即returnするのかclearまで進むのか、正常なappend-only結果をmaintenance-blocked(clear-pending)とするのかを、完全な遷移表とcall-count契約で固定する必要がある。

## Iteration 1 Resolution

- `persistBlocked`のexclusive transitionはconflictを即時pre-commit failureとし、再評価0回へ統一した。既存non-exclusive callerは本Unitのcall-count対象外である。
- outboxは独立fileではなくMirror state block内に埋め込み、business stateと同じatomic renameでcommitする。crashがrename前なら両方旧状態、rename後ならbusiness stateと完全outboxが同居する。
- `AtomicStatePort.withExclusiveTransaction`がlockを取得し、lock付き`ReadyHandle`をcallback内だけに閉じる。readからmaintenance returnまたはcommit／audit／clear完了までlockを保持する。
- maintenanceは一回のpassでappend最大1回、成功／already-present時のclear最大1回を実行し、どの結果でもcurrent transitionへ進まない。

## Iteration 2 Resolution

- current transition invocationはstate＋embedded outboxのatomic renameを1回だけ行い、audit append成功時もoutboxをclearしない。次のmaintenance invocationがclear用renameを最大1回所有するため、invocation単位のrename／render上限を守る。
- maintenance clearのwriteはpre-rename failureとdirectory-fsync後の`clear-unknown`を分離する。後者はoutbox present／absentの双方を許し、次回readで回復方向を決める。
- lock capabilityを表す`ReadyHandle`をinterfaceから削除した。`AtomicStatePort.executeExclusive`がlock、再読、maintenance、transition factory呼出、commit、releaseを内部所有し、外部へ権限objectを渡さない。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T08:09:31Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4件は設計へ反映された。しかし、embedded outbox方式によって新たに、state書込み回数・serialization予算との矛盾、clear後fsync失敗の誤った状態分類、TypeScriptでは実現不能なcompile-time handle寿命保証が生じている。

### Findings

- reliability-design.mdは、state＋outboxのcommitで1回、その後のoutbox clearで2回目のatomic state write／renameを行う。一方、performance-requirements.mdとperformance-design.mdはcurrent-transition用state renameを最大1回とし、scalability-requirements.mdは二重serializationを禁止、scalability-design.mdは単一parse／renderを主張している。clean経路では少なくとも2回のrender／renameが必要になるため、計測対象と合格条件を更新するか、永続化方式を再設計する必要がある。
- embedded outbox clearのrename成功後にdirectory fsyncが失敗した場合、outboxは存在する／clear済みのどちらもあり得る。それにもかかわらず、状態機械は一律にmaintenance-blocked(clear-pending)またはok(outbox-pending)とし、failure-injection設計はstale embedded outbox保持を要求している。このassertionは保証不能である。clearについてもpre-rename failureとdurability-unknownを型で分離し、後者の許容postconditionと次回回復動作を定義する必要がある。
- ReadyHandleをbranded typeにしても、TypeScriptではcallbackによるclosure capture、外部変数への代入、returnをcompile-timeで禁止できない。logical-components.mdのcallback外へreturnできないとreliability-design.mdのcompile-time非流出は、提示されたinterfaceでは達成不能である。handleを公開interfaceから除去してtransaction内部だけで消費するか、runtime失効検査へ保証を変更する必要がある。
