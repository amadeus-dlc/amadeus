# Infrastructure Design Questions — U5 Apply Verify And UX

> Stage: construction / infrastructure-design  
> Unit: U5 Apply Verify And UX

## Questions

### Q1. U5にrollback service、target lock、daemon、またはhosted monitoringを導入するか

[Answer]: No. U5はlocal in-process apply/manifest/verification boundaryとして実装し、rollback workflow、target lock、daemon、queue、database、hosted monitoringは導入しない。安全性はU4のplan contract、U5のsequential apply、atomic manifest write、CI temp-dir/fault fixturesで担保する。

## Ambiguity Analysis

曖昧な回答はない。`business-logic-model.md` はU5を承認済み `FileOperationPlan` の表示・確認・適用・manifest write・verificationに限定し、version resolution、target detection、planning policy recalculationを境界外にしている。

矛盾はない。`security-design.md` は `canApply:false` mutation block、prompt suppression、manifest sequencingを要求し、`reliability-design.md` は no-write / apply-failed / manifest-write-failed / verification-failed / success の状態を分離している。Infrastructure Designはlocal filesystem adapter、atomic manifest write、plain-text reporter、CI fault injectionに限定する。

不足情報はない。具体的な reporter snapshots、temp-dir integration、fault injection tests、manifest atomic write implementation は code-generation/build-and-test が所有する。

## Upstream Coverage

- `performance-design.md`: render/apply/manifest/verification budgets、no-write fast path、resource strategyを反映する。
- `security-design.md`: no-write mutation block、no policy recalculation、backup durability、prompt suppression、manifest sequencingを反映する。
- `scalability-design.md`: single-target sequential apply、2,000 operations、500 backups、50 MiB copy、no daemon stateを反映する。
- `reliability-design.md`: result state machine、ordering invariants、diagnostics contract、atomic manifest writeを反映する。
- `logical-components.md`: SetupApplicationService、Reporter、PromptAdapter、FileApplier、ManifestStore、Verifier、ResultClassifierを前提にする。
- `components.md`: File Applier、Manifest Store、Verifier、Reporter、Prompt Adapter、Setup Application Serviceのownership境界を参照する。
- `services.md`: Planning ServiceからReporter/Applierへの `FileOperationPlan` contract、manifest lifecycle、PR gatesを反映する。
- `business-logic-model.md`: Apply、Manifest、Verification、Reporter、Prompt workflowを反映する。
