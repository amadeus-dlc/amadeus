# Logical Components — five-harness-intent-completion

## 入力と境界

本設計は`functional-design/business-logic-model.md`を正本とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected absenceである。

## Component inventory

| Component | Owns | Isolation |
| --- | --- | --- |
| `CompletionCohortResolver` (M08) | registry capability、sorted cohort、cohort digest | descriptor順や手書きharness unionへ依存しない |
| `IntentLiveAuthorizationService` (U5/M06) | full revision authorization、protected event plan、commit binding | credential値をCoreへ持ち込まない |
| `IntentLiveRunCoordinator` (U5/M06) | persistent reservation、commit binding、canonical reconcile、dispatch claim CAS、attempt budget | uncommitted / stale / already-claimed stateからdispatchしない |
| `CanonicalLiveRunStateReader` / `NoEffectProofVerifier` (M07 adapter) | current run head、commit receipt、operation proofの再検証 | caller proof digestをauthorityにしない |
| `HarnessRuntimeAdapter` (M09) | operation + attempt idempotency、native install / invocation、Judge / decision observation抽出 | 同一dispatch keyをexactly one operationへ線形化 |
| `IntentLiveReceiptValidator` (M08) | canonical authorization / observation検証、validation event plan | caller自己申告をauthorityにしない |
| `CanonicalLiveEvidenceReader` (M07 adapter) | authorization / audit / receiptの同一snapshot read | explicit Intent partitionだけを読む |
| `IntentCompletionEvaluator` (M08) | cohort全件評価、completion evidence plan | validation event identities以外を入力にしない |
| `TerminalCommitPlanner` (M06/M04) | ordered terminal events、deterministic transaction identity | incomplete evidenceを受理しない |
| `ProtectedTerminalAppender` (M07) | lock内再検証、CAS、atomic append、idempotency | 部分commitを公開しない |
| `HarnessPackagingProjection` | registryから生成型 / distribution / adapter unionを再生成 | Core algorithmをharness別forkしない |

## Dependency direction

`Harness Registry → Cohort Resolver → Authorization Service → Live Run Coordinator → Native Adapter → Receipt Validator → Completion Evaluator → Terminal Planner → Protected Appender`の方向に限定する。M08 / M06はM07を直接importせずcanonical reader / appender portを使い、M09 adapterはevaluatorやterminal eventを生成しない。

## Failure domains

- credential / environment不備: 対象harness authorizationまたはrunだけを失敗させる。
- native adapter不備: safe failed receiptまでに閉じ、他harnessのvalidation eventを変更しない。
- native effect uncertainty: reconcile proofがattested no-effectでない限りrunをincompleteへterminal化し、Judgeを再invokeしない。
- receipt validation不備: validation eventを作らずIntentをincompleteに保つ。
- cohort / revision drift: evidenceを作らず新snapshotから再評価する。
- terminal CAS / parser不備: terminal transaction全件を拒否し、grant / workflow / sealを変更しない。
- packaging drift: generated distribution checkを失敗させ、Core runtime contractを変更しない。

## Observability

Intent、harness、authorization、receipt、validation、evidence、transaction、trace / spanのsafe ID / digestを既存Event Registry / OTelへ載せる。credential、raw prompt、raw command、attestation materialを載せない。statusはmissing / rejected harness IDをsafe enumとして示すが、secretやenvironment detailを公開しない。

## Verification

component contract fixtureは現行5 harnessで同じcohort / canonical vector / terminal resultを検証する。session / process / compaction / clone reload、future harness追加、partial failure、same-plan replayでdependency bypassや別adapter内Core実装がないことを確認する。
