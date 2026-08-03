# Code Generation Plan — execution-observability-baseline

## 入力とトレーサビリティ

本計画は `unit-of-work.md` の Unit 1、`unit-of-work-story-map.md` の S1・S2・S7、`requirements.md` の FR-01・FR-06・FR-08、同Unitの `functional-design`、`nfr-requirements`、`nfr-design` を入力とする。対象Issueは [#1602](https://github.com/amadeus-dlc/amadeus/issues/1602)。Test StrategyはComprehensiveである。

## 実施計画

- [x] **Step 1 — Execution Contractを実装する**: opaqueなroot／child／attempt identity、`Fact<T>`、clock sourceとmeasurement qualityを共有coreへ追加する。S1、S2、FR-01へ対応。
- [x] **Step 2 — audit-first Lifecycle Coordinatorを実装する**: start、reserve、claim、confirm、finish、idempotency conflict、canonical write refusalをper-intent lockとJSONL auditへ統合する。S1、FR-01、FR-08へ対応。
- [x] **Step 3 — required projection barrierを実装する**: state／runtime graphを同じevent-set digestへ投影し、両receiptが揃うまでnative開始を許可しない。OTelはbest-effortに隔離する。S1、S7、FR-06へ対応。
- [x] **Step 4 — harness capabilityを共有形へ正規化する**: Claude、Codex、Cursor、Kiro、Kiro IDE、OpenCode、Kimiのnative factとeffect query availabilityをharness-neutral contractへ写像する。S7、FR-06へ対応。
- [x] **Step 5 — baseline manifestを実装する**: workload、observed SHA、environment fact、root／child／attempt、duration、outcome、terminationをauditから機械可読manifestへ再構築する。S2、FR-08へ対応。
- [x] **Step 6 — unit testを作成する**: identity、resume／Redo、clock fallback／invalid、availability、lifecycle idempotency、harness capability、manifest、projection barrierをfake clock／writer／sinkで検証する。Comprehensive strategyへ対応。
- [x] **Step 7 — integration testを作成する**: canonical audit event、event registry drift、runtime/state投影、manifest再構築、birth provenanceとの接続を検証する。S1、S2、S7へ対応。
- [x] **Step 8 — event registry・audit vocabulary・runtime schemaを同期する**:新eventとprojection fieldを正本へ登録し、drift sensorを更新する。FR-01、FR-06へ対応。
- [x] **Step 9 — documentationを同期する**: state machineとruntime graphの英語／日本語referenceへexecution observability contractを反映する。FR-01、FR-08へ対応。
- [x] **Step 10 — package／self-install生成物を同期する**: 正本から7 harness packageと影響5 self-install面を生成し、直接編集を行わない。S7、FR-06へ対応。
- [x] **Step 11 — test configurationを維持する**: 既存Bun test runner、coverage registry、size metadataを更新し、新しいrunnerやdependencyを追加しない。Comprehensive strategyへ対応。
- [x] **Step 12 — convergence gateを実行する**: typecheck、lint、742 test files、package check、promote checkを実行し、refereeの60秒枠では対象83件＋typecheckを再検証する。全受入条件へ対応。

## 非該当

API endpoint、database、migration、UI、deployment artifactは本Unitのshared CLI coreに存在しないため追加しない。新規runtime／development dependencyも追加しない。
