# Code Generation Plan — eligibility-report (U8, Bolt 4 最終ユニット)

## 上流入力(consumes 全数)

business-logic-model.md / business-rules.md / domain-entities.md(functional-design)、logical-components.md / performance-design.md / reliability-design.md / scalability-design.md / security-design.md(nfr-design)、nfr-requirements、unit-of-work.md(§ eligibility-report)、requirements.md、bolt-plan.md(§ B4)、既存実装 scripts/formal-verif/(U1〜U7)。

## スコープと境界

U8 は hard eligibility gate、3軸 Pareto、Alloy trigger、reproducible report / trace verification、wiring-only final CLI root を所有する。raw evidence / matrix / cost / arm oracle を生成・書換えない — U2〜U7 の成果物を immutable input として consume する。

NFR 設計が記述する process isolation / TrustedReportPublisher / ReportRevisionClaim store / SandboxedReportWorker は、テストシームとしての port 化が設計意図であり(logical-components.md「Test seams: input/store/sandbox/clock を port 化」)、実プロセス隔離・publisher の物理実装は本ユニットの pure domain core と別 tier である。LOC 予算 300–460 に収めるため、本 code-generation は評価・判定・report・trace・wiring の pure domain 論理を port ベースで実装し、物理 publisher / claim store / sandbox は実装しない(実装した場合、単一ユニットで数千 LOC となり予算と分解漏れ停止条項に抵触する)。この境界は unit-of-work.md の完成条件(wiring test の handler 一意性・error propagation、同一 evidence からの同一 closed decision 再計算、全 row の command/CI/artifact 到達)に忠実である。

## BR-22 / FinalCompositionStatus

U3/U4/U5 の max-exhausted 後第三 review 未実施、U7 残存 Major 2件、および最終 FD 人間裁定前であることを保持する。`final-cli-root` は full-matrix.ts の `MATRIX_INTEGRATION_STATUS` と同型に `FINAL_COMPOSITION_STATUS = "DESIGNED_BLOCKED_ON_FINAL_FD_GATE"` を持ち、composition に必須 field として焼き込む。code-generation は composition を構築・検証するが、integration readiness / walking-skeleton completion / report completion / code-generation 可を主張しない。

## 生成モジュール(scripts/formal-verif/)

### 1. eligibility.ts(~180 LOC)
- 値型: `EligibilityReason`(DEFECT_NOT_DETECTED / HARNESS_ERROR / BASELINE_FALSE_POSITIVE)、`CostTuple`(ArmAuthoredLoc, AuthoringElapsedMs, SuiteMedianMs、全 non-negative)、`FinalDecision`、`ParetoRelation`、`AlloyTriggerState`、`EvaluationIdentity`。
- 入力 view: `deriveMeasuredCells(inputSet, run)` が U7 `FullMatrixRun` の MEASURED suite から `MeasuredCell[]`(arm, subject, runNo, isBaseline, verdict, alias/contract class)を導出。
- `verifyStructure(matrix)`: U7 `FullMatrixValidation` が CompleteMatrix、または findings が verified expected `HARNESS_ERROR_CELL` のみの `StructurallyCompleteHarnessMatrix` の場合だけ通す。missing / timeout / duplicate / corruption / drift / disagreement は `EvaluationFailure`(BR-01)。
- `classifyArm(view, arm)`: 全 defect DETECTED 一致 / HARNESS_ERROR 0 / baseline 全 NOT_DETECTED → Eligible、それ以外は reason 別 Ineligible(BR-02〜05)。
- `comparePareto(t, s)`: 3軸 strict dominance、trade-off / 完全同値 → NON_DOMINATED_PAIR(BR-08)。weighted sum / 単位換算 / tie-break / SHARED_LOC 按分なし(BR-09)。
- `closeDecision(view, eligibilityByArm, costs?)`: 片方 eligible → その arm candidate、両 ineligible → BOTH_INELIGIBLE(cost 不要)、両 eligible → cost 必須で Pareto(BR-06/07)。`EvaluationFailure` を `BOTH_INELIGIBLE` へ丸めない。`EvaluationIdentity` = canonicalIdentity(sources + algorithmVersion + result)。
- `assessAlloy(view)`: valid matrix の defect cell に NOT_DETECTED が1件以上で miss registry 列挙、両 arm 共通 contract class を common blind spot、`SEPARATE_DECISION_REQUIRED`、0件で `NOT_TRIGGERED`(BR-10〜12)。Alloy 実装/追加/比較はしない。

### 2. eligibility-report.ts(~150 LOC)
- 値型: `ReversalConditionRef`(grilling 正本 identity, ordinal, text hash)、`ReversalConditionMapping`、`ReportModel`、`TraceIndexEntry`、`TraceVerificationResult`、`RenderedReport`。
- `verifyReversalMappings(source, mappings)`: 6体グリリング正本 conditions と mapping keys の bijection、各条件へ非空 SUPPORTS/REFUTES cell refs、未対応・正本外創作・source drift を拒否(BR-17a)。
- `buildReportModel(...)`: defect registry / branch・commit / freeze / input・schedule / matrix / baseline / raw・aggregate cost / decision / Alloy / 全 reversal mapping / trace index を canonical model へ immutable 結合、`ReportIdentity`(BR-13)。
- `verifyTrace(model)`: row と source refs の bijection、content hash、arm/subject/sample/run・freeze/input/schedule continuity を再検証(BR-14)。missing / duplicate / hash drift / semantic drift を全数保持。
- `renderReport(model, verifiedTrace)`: verified 時だけ canonical JSON + escaped Markdown を生成、失敗時 `ReportFailure`(BR-15)。renderer は decision field を copy し再計算 port を持たない(BR-16)。Markdown control/table/link/HTML escape。
- 同一 canonical input + algorithm version → 同一 decision/report identity(BR-17、canonical.ts の決定性による)。

### 3. final-cli-root.ts(~80 LOC)
- 値型: `HandlerBinding`、`FinalCliComposition`、`WiringVerification`、`WiringError`、`FinalCompositionStatus`。
- `FINAL_COMPOSITION_STATUS = "DESIGNED_BLOCKED_ON_FINAL_FD_GATE"`。
- `composeFinalCli(bindings)`: U1 `COMMAND_KINDS` 全 command と binding の bijection、exactly one handler、欠落/重複/unknown fallback 拒否、U1 `HandlerRegistry` を構築(BR-18/19)。
- `verifyWiring(composition)`: closed command set と binding set の exact equality、handler identity 一意性、error/exit propagation の契約検証(BR-20)。root は評価/Pareto/Alloy/report を実装しない。

### index.ts への export 追加(3 モジュール)。

## テスト(pure function、unit tier: fs-tests-integration-first に従い実 FS 不使用のため unit)

- tests/unit/t-formal-verif-eligibility.test.ts — 構造ゲート(complete / HARNESS-only / incomplete)、eligibility 4経路、defect miss、HARNESS_ERROR、baseline false positive、片方/両方 eligible の cost 要否、T/S dominance、trade-off、完全同値、weighted score 不在、Alloy miss / common blind spot / NOT_TRIGGERED、同一 input 再計算(identity 一致)。
- tests/unit/t-formal-verif-eligibility-report.test.ts — reversal 全数/非空/非創作/source drift、trace bijection/hash drift、renderer purity(decision copy)、Markdown escape、verify 失敗時 publish 拒否、reproducibility。
- tests/unit/t-formal-verif-final-cli-root.test.ts — 全 command handler 一意配線、欠落/重複/fallback 拒否、error/exit propagation 不変、DESIGNED_BLOCKED status。

## 検証コマンド(同期実行、exit code 記録)
- `bun x tsc --noEmit -p tsconfig.json`
- `bun x tsc --noEmit -p tsconfig.tests.json`(自 unit 由来 0件。B1 skeleton 既存 red 9件はスコープ外)
- `bun x biome check <変更ファイル>`
- `bun test <自 unit テスト3件 + 関連>`(path 実在事前確認 + "Ran ... across N files" 照合)
- 回帰 spot: `bun test tests/unit/t-formal-verif-contract.test.ts`
- deslop 後に上記再実行。

## LOC 予算
3 モジュール合計 ~410 LOC(300–460 内)。実装中に超過見込みが出たら停止・申告する。
