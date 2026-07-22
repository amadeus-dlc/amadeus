# Scalability Design — full-matrix-suite

## 上流と cardinality

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。arms2、warmup1/arm、measured5/arm、entries12、subjects8/6、cells96/72に閉じる。

## RevisionLifecycle

revision identityはrevision/InputSet/Scheduleを束ね、active revision/schedule/suite/process各1とする。変更は全12 suites新revisionで旧evidenceを保持する。ACTIVE capacity/execution/resource claimsをdurable取得し、dead owner resumeは同host/CPU/core/memory/sandbox lease再取得と全identity一致後のatomic RESUMEDだけを許す。不一致は残scheduleを開始せずINCOMPLETE terminalへ閉じる。

matrix indexはidentityだけをcell数線形に持ちraw bytesを複製しない。終了はCLOSED|ABORTEDとphysical reservation RELEASEDで閉じる。

## Verification

12/96/72と±1、2 revision、claim競合、same-policy resume、host/core/memory/provider drift INCOMPLETEを検査する。sampling/parallel/silent truncation=0である。

