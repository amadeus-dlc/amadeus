# Code Generation Plan — election-model(Bolt 1 walking-skeleton)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、reliability-design.md、logical-components.md、unit-of-work.md、requirements.md、bolt-plan.md

## Bolt 1 スコープ(bolt-plan.md:11 の U1 核)

- 型一式(Goa/Election/Choice/DistributionView 型宣言/Ballot union/BallotRef/BallotError/TallyResult — domain-entities.md 宣言列)+`Election.parse`+最小 tally(zero-confirm 確定パス — business-logic-model.md 先勝ち決定表の4段全実装)+trivial 票受理(構文+GoA 数値 parse — tally が Goa を消費するため数値境界は繰延不能 — requirements.md FR-4 受け入れの verification-numeric-parse。5クラス完全化・シャッフル・early tally・後着分類は Bolt 2)
- 配置: `scripts/amadeus-election-model.ts` 単一モジュール(logical-components.md — unit-of-work.md U1 行+ADR-1 の典拠)
- テスト: unit 層 t234(fs 非依存純関数 — business-rules.md のテスト列のうち Bolt 1 到達分)

## 実装順序と検証

1. Result/Goa ブランド型 → 2. Election/Ballot parse(fail-closed Result — reliability-design.md)→ 3. tally 決定表 → 4. t234 unit テスト → 5. 検証定型(typecheck/lint/--ci/patch gate/complexity gate)
