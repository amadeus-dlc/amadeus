# Performance Design — solo-election-surface (U2)

上流入力(consumes 全数): performance-requirements.md(U2-PERF)、security-requirements.md(U2-SEC)、scalability-requirements.md(U2-SCALE)、reliability-requirements.md(U2-REL)、tech-stack-decisions.md(prose+integration 層の決定)、business-logic-model.md(ソロ手順・降格・ノルム改定の設計正本)。

## 設計

- U2-PERF-01(TS 変更ゼロ): 変更ファイルは canonical SKILL.md・team.md・新規 integration テスト・投影面のみ。合否 = `git diff --name-only` に packages/framework/core/tools/*.ts が現れないこと(テストは tests/ 配下)。
- U2-PERF-02(コスト上限): 発動類型の記述は SKILL 起動節と team.md の**同文**(BR-U2-5)で固定し、テストが両文書から該当ブロックを抽出して文字列一致を assert する。

## 検証配線

同文照合テストは canonical SKILL.md(1面)と amadeus/spaces/default/memory/team.md を読む integration 層に置く(投影面は dist:check が担保するため読まない — U2-SCALE-02 と整合)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T15:47:38Z
- **Iteration:** 2
- **Scope decision:** none

Major(許可トークン3→2復帰、voter は viewPath ファイル名+view 内 voter フィールドから導出 — blind 契約適合を DistributionView 実型で確認)・Minor 2件(両側落ちる実証・checkout 手順)を実測閉包。是正 diff の新規欠陥なし。

### Findings

- None
