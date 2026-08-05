# Logical Components — loop-monitor-runtime

## 入力と境界

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

Loop Monitorは新しい常駐supervisorではない。既存の短命workflow engine、audit / replay、harness verificationへ疎結合なlogical componentを追加する。PR運用、Quality Repair、autonomy grant、外部plugin manifest形式は別Unit / Issueの責務である。

## Component inventory

| Component | Owns | Failure domain / isolation |
| --- | --- | --- |
| `MonitorContributionCompiler` (M01) | manifest、provider / instruction / route binding、transition table、runtime limits、graph revision | 1件の不正でcompile全体をfail-closed。runtime stateを変更しない |
| `LoopMonitorReducer` (M02) | pure cycle matching、threshold、pending、reservation、latch plan | filesystem / provider / clock非依存。typed resultだけを返す |
| `MonitorCoordinator` (M06) | event normalization、evidence取得、commit-before-dispatch、attempt 0/1 reconciliation | adapter effectをCore projectionから分離し、permitなしdispatchを拒否 |
| `MonitorAuditStore` (M07) | atomic append、WAL、content identity index、partition replay、Judge attempt projection、status projection | per-clone physical writeをcausal mergeで収束し、redispatch budgetを耐久化 |
| `JudgeAdapterPort` (S01) | `dispatch` / `reconcile` closed union、provider receipt | provider障害をpossible / unknownとして閉じ、無制限retryしない |
| `LiveAuthorizationPort` (M08) | credential-attested safe metadataとauthorization plan | raw credentialをCore / auditへ渡さない |
| `HarnessContractVerifier` (M09) | 5harness fixture、opt-in live、package / promote drift receipt | registry-derived cohortでCore分岐を防ぐ |
| `MonitorRepairCommand` | 明示的なindex検査・再生成 | normal resumeから隔離し、repair中はworkflowをpark |

## Dependency direction

`MonitorContributionCompiler → CompiledMonitorSet → LoopMonitorReducer`の方向だけを許す。ReducerはCoordinator、AuditStore、JudgeAdapterをimportしない。CoordinatorはReducerのplanをAuditStoreへcommitし、commit receiptからproof valueを得た後にだけAdapterを呼ぶ。

AuditStoreはcanonical auditをbusiness truthとし、MonitorReplayIndexとcheckpointを二次projectionとして扱う。HarnessContractVerifierはpublic portとregistryを介して検証し、各harness固有shellをCoreへ持ち込まない。

Judge attemptも同じ原則に従う。M06はattested `no-effect-confirmed`からattempt 1の`LOOP_JUDGE_STARTED` planを一度だけ生成し、M07はそのcommitでredispatch permitの発行とbudget消費を原子的に記録する。`LoopMonitorReducer`はcanonical started eventからclosed attempt stateを再生し、attempt 1が存在するinvocationへ次のpermitを生成しない。

## Blast radius

- manifest compile失敗: 新revisionのMonitor setだけを拒否し、既存canonical auditを変更しない。
- 1 Monitorの`INCOMPLETE` / `CONFLICT`: 同じMonitor scopeをparkし、別Intent / Monitor partitionへ伝播させない。
- Judge adapter不確定effect: 該当invocationだけを`AWAITING_HUMAN`へ移し、他Judgeを再dispatchしない。
- Judge redispatch中のcrash: attempt 1 started eventを再生して同じattemptをreconcileし、attempt 2を作らない。
- replay index破損: normal resumeを停止し、明示repairへ移す。canonical auditを破棄しない。
- live authorization不備: live smokeだけを拒否し、contract fixture検証を失敗扱いにしない。

## Test seams

graph source、plugin contribution、Evidence provider、AuditStore、JudgeAdapter、human-turn verifier、live authorization、registry、clock / hashをport化する。pure reducer fixture、crash injection、clone merge、redaction、5harness matrixをそれぞれ独立検証し、最終integrationでcommit receiptとtrace identityを接続する。
