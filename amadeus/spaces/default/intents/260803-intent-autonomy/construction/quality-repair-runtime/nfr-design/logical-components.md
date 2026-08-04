# Logical Components — quality-repair-runtime

## 入力と境界

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

Quality Repairはgeneric Loop Monitorを再利用するfirst-party contributionであり、新stage、常駐supervisor、PR convergence、gate / question認可、Intent grantを所有しない。

## Component inventory

| Component | Owns | Isolation |
| --- | --- | --- |
| `QualityContributionSource` (M03/S03) | first-party Monitor、provider / instruction / route / output descriptors | source不備でactivation全体を拒否 |
| `QualityActivationResolver` (M06/M07) | mode、none opt-in provenance、active graph revision | headless inputをopt-inにしない |
| `QualityEvidenceCollector` (M06) | reviewer / sensor / produce / condition terminal receipts | 宣言sourceだけを収集しraw proseを渡さない |
| `QualityEvidenceNormalizer` (M03) | obligation、snapshot、delta、fingerprint | pure / deterministic、previous snapshotを明示入力 |
| `QualityConvergenceReducer` (M03) | T+1 window、strict progress、pattern、singleton route constraint | repair意味論をM02から隔離 |
| `LoopMonitorCore` (M02) | generic threshold、Judge reservation、latch | quality categoryやmodeを知らない |
| `ReplanCoordinator` (M06) | attempt 0/1 reservation-before-effect、agent reconcile、review cycle handoff | plan effect uncertaintyとretry budgetをworkflowから隔離 |
| `QualityAuditProjection` (M07) | epoch、snapshot、replan attempt、cycle、stall、resumeのatomic replay | per-scope canonical truth、attempt 2を拒否 |
| `QualityHarnessVerifier` (M08/M09) | 5harness fixture、authorization-bound live receipt | harness固有algorithmを禁止 |

## Dependency direction

`Contribution → Activation → Evidence Collector → Evidence Normalizer → Convergence Reducer → LoopMonitorCore`の順で流す。M02はQualityObservation、repair / replan agent、autonomy modeをimportしない。ReplanCoordinatorはcanonical Judge routeとreservation commit receiptを受けて初めてagent portを呼ぶ。

AuditProjectionはcanonical eventをtruthとし、statusとresume envelopeを同じprojectionから生成する。HarnessVerifierはpublic adapterとregistryを通じて同じfixtureを実行する。

ReplanCoordinatorはattempt 0のattested no-effect後だけattempt 1 successor reservation planを生成する。AuditProjectionはそのcommitをpermit発行とbudget消費の両方として再生し、attempt 1が存在するbase reservationへ次のsuccessorを認めない。

## Blast radius

- contribution不備: Quality Repair activationだけを拒否し、既存workflow artifactを変更しない。
- evidence incomplete: 対象quality scopeをrepair / haltし、passへ丸めない。
- replan effect unknown: 対象reservationをsuspendし、別scopeやgrantを変更しない。
- repair stalled: 対象workflow executionをsuspendするが、active full grantはU3契約どおり保持する。
- harness live unavailable: contract fixture結果を維持し、live successを捏造しない。

## Test seams

contribution、human provenance、reviewer / sensor / filesystem / verification evidence、previous snapshot、Judge、replan agent、audit transaction、clone merge、harness registryをport化する。各componentをpure fixtureとcrash injectionで検証し、最終integrationでepoch / trace / receipt identityを結ぶ。
