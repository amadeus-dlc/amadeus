# NFR Design Questions — stage-stats-attribution-service

## Interaction mode

- Mode: Guide me
- Decision: `auto-decision-38b48a131dbe071a0f9efc7c102b4ee2`
- Intent autonomy: semi

## Questions and answers

追加質問は0件。`business-logic-model.md`がone-shot read-only process、固定orchestration、既存measured互換、3renderer parity、exit ladder、stdout drain、current-corpus下限、complexityを確定している。NFR Requirements stageはscopeでskipされており、未決のSLO、AWS resource、認証方式、autoscaling、retry方針を新設しない。

## Upstream applicability and ambiguity analysis

- `business-logic-model.md`だけがengine directiveのpresent consumeで、全NFR design decisionは同artifactとRequirements Analysis/Application Designのcontextから一意に導出できる。
- `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はNFR Requirements stageのscope skipに伴うexpected-absentで、declared NFR requirement IDは存在しない。
- Requirements AnalysisのNFR statementはcontext evidenceとして参照するが、NFR Designのaddressing IDへ転用しない。

## Evidence

- `requirements.md:283-309`がcorrectness、determinism、fail-closed、pipe/process、current-corpus scale、maintainability、read-only safetyを規定する。
- `services.md:9-20`がone-shot CLIのinput/output/lifecycle/scale/failure isolationを規定する。
- `business-logic-model.md`がIssue #2695完了条件1〜10を固定設計へ閉じている。
