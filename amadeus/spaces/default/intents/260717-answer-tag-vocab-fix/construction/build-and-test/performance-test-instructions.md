# Performance Test Instructions — answer-tag-vocab-fix(Issue #1127)

> 上流入力(consumes 全数): `../answer-tag-vocab-fix/code-generation/code-generation-plan.md`(検証列・統制)、`../answer-tag-vocab-fix/code-generation/code-summary.md`(出荷物・実測)。測定 ref: bolt head 66f8c885b(PR #1153、origin/main a4a33e59a 起点)。2026-07-17。

## 比例選定(build-and-test:c1/c3)

正規表現1文字の変更に専用性能検査は追加しない — 承認済み NFR に性能要件なし(bugfix スコープ・requirements に性能 AC 不在)。充足面はテストランナー予算契約(`--ci` の wall-clock drift 0 file(s) 実測)のみ。

## 判定

N/A(反証可能根拠: 変更は module-load 時に1回評価される const 正規表現リテラルで、実行頻度・計算量とも既存と同一クラス)。
