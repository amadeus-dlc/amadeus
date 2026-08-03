# Code Generation Plan — interaction-budgets

## 入力とトレーサビリティ

本計画は `unit-of-work.md` の Unit 3、`unit-of-work-story-map.md`、`requirements.md` の FR-04／FR-04A、同Unitの `functional-design`、`nfr-requirements`、`nfr-design` を入力とする。対象Issueは [#1999](https://github.com/amadeus-dlc/amadeus/issues/1999)。Test StrategyはComprehensiveである。

## 実施計画

- [x] **Step 1 — interaction語彙を閉じる**: reviewer findingを `BLOCKER | FOLLOW-UP | NIT` の3値へ統一し、再現可能な実害、要求違反、明確な回帰の証拠があるfindingだけをblockerにする。
- [x] **Step 2 — READY／NOT-READYを反証可能にする**: 未解決BLOCKERだけがNOT-READYを導き、FOLLOW-UPとNITはREADYを妨げないclosed verdictをreviewer runtimeへ実装する。
- [x] **Step 3 — Thermo-Nuclear Reviewを校正する**: 改善可能性、code-judo候補、循環依存の存在推測を根拠なしblockerにせず、証拠がないことを正常な結果として扱う。
- [x] **Step 4 — material ambiguityと質問予算を共通化する**: 成果物、外部契約、データ安全性を実質的に変える不可逆判断だけをmaterial ambiguityとし、追加質問を1ラウンドに制限する。
- [x] **Step 5 — depth guidanceを有限化する**: Minimal／Standard／Comprehensiveの質問数を4／8／12の上限とし、数量達成ではなく要求・リスクcoverageを完了条件にする。
- [x] **Step 6 — stage completionを閉包する**: 必須成果物、宣言済み検証コマンド、未解決BLOCKERだけを確認し、完了確認時の追加探索を禁止する。
- [x] **Step 7 — subagent concernをtriageする**: BLOCKERだけを中断要因、FOLLOW-UPを完了メッセージ集約、NITを省略可能にする。
- [x] **Step 8 — test guidanceをrisk-basedへ統一する**: 固定本数quotaを撤去し、Standard／Comprehensiveの8／15は計画上限として扱う。test strategyを唯一のfloorにする。
- [x] **Step 9 — 重複規則を正本へ集約する**: 個別stageに重複した曖昧性・質問規則を共通protocol参照へ置換し、7 harnessのauthored sourceへ同じ契約を投影する。
- [x] **Step 10 — 回帰testと生成物同期を行う**: reviewer production path、stage protocol構造、interaction budget contractを検証し、package／self-install生成物を正本から同期する。
- [x] **Step 11 — convergence gateを実行する**: lint、typecheck、対象test、full `test:ci`、package、promote、diff checkを実行し、refereeでは60秒以内の対象test＋typecheckを再検証する。

## 非該当

Codex専用gate、Codex専用counter、harnessごとの別severityは追加しない。native UI差は既存renderer／capability境界に留める。Stop／swarm retryの機構予算はUnit 2、bounded Unit poolはUnit 4の所有である。
