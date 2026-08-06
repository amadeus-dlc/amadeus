# Unit Test Instructions — 260804-tla-authoring

上流入力(consumes 全数): 各 unit の code-generation-plan.md(TDD スライスとテスト番号予約の宣言)と code-summary.md(unit テストの実測結果)。

## 対象スイート(unit 層 — 純関数層のみ、実 FS は integration へ)

- t444(×3 ファイル): applicability 判定表 / hold 評価器 / advisory 宣言 parse
- t446: trace coverage referee + proof obligations(4欠陥クラス / 5条件の全数収集)
- t448: registration committer の前提6検査(PreconditionFailure 全数集約)

## 実行

`bun test tests/unit/t444-*.test.ts tests/unit/t446-*.test.ts tests/unit/t448-*.test.ts --timeout=30000`

実測(U5 着地断面、code-summary.md 転記): 全ファイル 0 fail。TDD は各 unit の plan が宣言する Red→Green スライスで実施(t444 統一前 2 fail → 統一後 green 等の対照を code-summary.md に記録)。
