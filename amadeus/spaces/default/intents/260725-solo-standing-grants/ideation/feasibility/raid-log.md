# RAID Log: Solo Standing Grant

## Risks

| ID | Risk | Likelihood | Impact | Treatment | Evidence / owner |
|---|---|---|---|---|---|
| R-01 | space横断探索で別intentのgrantをsolo gateへ適用する | High if reused | Critical | intent-bound selectionとmismatch test | Architect |
| R-02 | route後失効をerrorとして扱い`ERROR_LOGGED`を発行する | High with current report | High | typed fallbackを通常directiveとして設計 | Architect |
| R-03 | route時とcommit時で異なるgrantを選ぶ | Medium | Critical | Grant Idを明示搬送しid指定再検証 | Architect |
| R-04 | team modeのdelegation意味論を変更する | Medium | High | mode固有経路を分離し既存testを固定 | Maintainer |
| R-05 | phase-boundaryまたはwalking-skeletonを誤認可する | Medium | Critical | 既存predicateを正本としてroute/commit共有 | Quality |
| R-06 | per-unit final gateでstage/reviewerを再実行する | Medium | Medium | all-covered re-entryを一度だけ認可候補化 | Engine maintainer |
| R-07 | harness手順またはdist生成物がdriftする | Medium | High | core正本とpromote/dist check | Harness maintainer |
| R-08 | grant失効とaudit commitが競合し、部分eventを残す | Low with lock | Critical | lock内再検証をapproval audit前に実行 | State owner |

## Assumptions

| ID | Assumption | Validation status | Consequence if false |
|---|---|---|---|
| A-01 | solo grantは発行時のactive intentだけを対象にする | Issue #1466で明示 | target modelを再決定 |
| A-02 | default TTLは現行4時間を維持する | Issue #1466 / existing constant | requirementsで再確認 |
| A-03 | phase-boundaryはdefault除外を維持する | User / Issue | gate policy変更が必要 |
| A-04 | external regulatory frameworkは非適用 | repositoryと変更面から確認 | compliance stage再評価 |
| A-05 | grant競合は通常の認可不成立でありsystem failureではない | User acceptance | audit/error contract再設計 |
| A-06 | existing audit lockは同一project内のgrant再検証とapproval commitを直列化できる | current `approveUnderLock` | transaction boundary拡張が必要 |

## Issues

| ID | Current issue | Severity | Resolution path |
|---|---|---|---|
| I-01 | solo modeはgrant発行・取消を明示拒否する | Expected gap | requirementsでsolo issuance contractを定義 |
| I-02 | route directiveにauthorization carrierがない | High | application designで型を決定 |
| I-03 | approve CLIにGrant Id指定contractがない | High | functional designでcommit APIを定義 |
| I-04 | state tool拒否がorchestrator error directiveと`ERROR_LOGGED`になる | High | typed fallback seamを設計 |
| I-05 | current grantにsolo target binding fieldがない | Critical | audit eventの後方互換拡張を設計 |

## Dependencies

| ID | Dependency | Required outcome | Stage |
|---|---|---|---|
| D-01 | Reverse Engineering | 現行team flowと全call siteの完全な影響範囲 | reverse-engineering |
| D-02 | Requirements Analysis | grant lifecycle、authorization、fallback、auditのtestable contract | requirements-analysis |
| D-03 | Application Design | gate policyとauthorization sourceの分離model | application-design |
| D-04 | Functional Design | route/commit handshakeとrace transition | functional-design |
| D-05 | NFR Requirements / Design | atomicity、fail-closed、determinism、compatibility | construction design |
| D-06 | Code Generation | core正本、tests、harness projections | code-generation |
| D-07 | Build and Test | related/full/type/drift evidence | build-and-test |

## Decision Checkpoints

1. solo grantのtarget binding表現
2. directiveのauthorization carrier型
3. commit時のtyped fallback結果
4. route/commit共通predicateの所有module

これらは実装開始前のapplication-design gateまでに承認する。

## Upstream Traceability

本RAID logは`../intent-capture/intent-statement.md`の9つのSuccess Metricsと非交渉境界をrisk・assumption・issue・dependencyへ分解した。market-researchはSKIPされているため、外部市場依存は置いていない。
