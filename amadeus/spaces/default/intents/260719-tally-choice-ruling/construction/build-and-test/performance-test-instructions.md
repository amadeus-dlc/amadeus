# Performance Test Instructions — 260719-tally-choice-ruling

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 判定: N/A(根拠付き)

承認済み performance NFR は存在しない(requirements.md NFR は決定性・fail-closed・CI の3点)。変更は選挙1回分の票配列(高々メンバー数)に対する集計ロジックで、入力規模は構造的に小さい(voters 列挙は election.json 定義に閉じる)。build-and-test:c3 により専用性能テストは選定しない。

## 実施した比例検査(決定性の実測)

性能目標の不在下でも、NFR-1(決定性)の面から tally の同一入力再計算が同一出力になることを verify 経路(election.ts の recompute JSON 比較)で実証済み — t236 の verify PASS+mismatch 検出の両側テストが決定性の実測を兼ねる(build-test-results.md)。集計母集団は選挙定義の voters に閉じるため、規模起因の性能検査対象は構造的に存在しない。
