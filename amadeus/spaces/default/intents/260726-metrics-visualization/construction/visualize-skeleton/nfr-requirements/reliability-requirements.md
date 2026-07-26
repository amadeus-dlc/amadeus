# Reliability Requirements — U1 visualize-skeleton

上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

## 信頼性要件

- U1-REL-01: fail-closed / zero-write(business-rules.md ルール1、requirements.md FR-2)— 不正入力1件で書き込みゼロ exit 1。部分生成状態を作らない
- U1-REL-02: エラー原因の全列挙(business-rules.md ルール2): 空・不在・per-file 読込失敗・parse 失敗。すべて非空 stderr+exit 1 で観測可能
- U1-REL-03: 決定性(business-rules.md ルール11、business-logic-model.md の描画ステップが決定値のみ埋め込む構造)— 同一入力 → 同一バイト列。リトライ・再実行が常に安全(冪等)
- U1-REL-04: 既存機構の非破壊 — R-1 の export 追加が既存テスト(t230/t231)を退行させない(Bolt 1 冒頭のベースライン green 実測が受け入れ条件 — delivery-planning のリスク緩和)

## 非対象

- リトライ機構・部分回復 — 冪等な単発 CLI のため再実行が回復手段(U1-REL-03)。バックアップ・世代管理は git が担う(index.html はコミット対象)。ランタイム面の信頼性前提(Bun 単独・依存ゼロ)は technology-stack.md の可視化前提に従う
