# Functional Design Questions — feature-diff

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)（FR-1〜FR-5、NFR-1〜3）。

設計は requirements で確定済み（構造 = 軸ごと H2 + 三者比較表 + 出典列）。残る細部 1 問を自己判断（理由付き）で確定する。

## Q1. 三者比較表の列構成

- A. 5 列固定: | 観点 | 上流 main | 上流 v2（b67798c3） | Amadeus | 出典 |。main 列は v1 系で対応構造がない行では短い定型値（「対象外（v1 系。冒頭要約参照）」）、対応概念がある行では短い実値（例: ライフサイクル = .kiro spec 駆動形式）を入れる
- B. 4 列（main は節冒頭プロースで要約のみ）
- C. その他
- X. Other (please specify)

[Answer]: A（5 列。FR-1.2 の「三者比較表」を字義どおり尊重）。当初 B を自己判断したが、reviewer iteration 1 が「gate 承認済み FR-1.2（三者比較表 = main 列を含む）を『残る細部』の枠で覆す設計変更であり、受け入れ条件『三者の機能差が 1 文書で一望』を行単位で満たさなくなる」と指摘。指摘を妥当と判断し、要求を変えずに設計を要求へ合わせる A へ確定した。main が v1 系で行単位比較が薄くなる懸念は、短い定型値 + 冒頭「上流 main と v2 の関係」要約節の併用で吸収する。
