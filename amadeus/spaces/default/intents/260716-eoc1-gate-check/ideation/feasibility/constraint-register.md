# Constraint Register — eoc1-gate-check

## 上流入力(consumes 全数)

`../intent-capture/intent-statement.md`、`../market-research/competitive-analysis.md`(blocking 択)、`../market-research/market-trends.md`(機械化トレンド)、`../market-research/build-vs-buy.md`(自作継承)、feasibility-assessment.md、Issue #1101 制約節。

## 制約表

| ID | 制約 | 種別 | 出典 |
|----|------|------|------|
| C-1 | 検査結果は実行結果由来のみ(検証劇場禁止) | ガバナンス | Issue #1101 |
| C-2 | 落ちる実証3系(拒否2+正常系非拒否1)必須 | 品質 | 割当指示+クロスレビュー |
| C-3 | 正本編集+dist 8ツリー再生成+registry(Mandated) | 配布 | project.md |
| C-4 | 新設テストは配置層サイズ上限内(size purity) | テスト | #1060/t229 実測知識 |
| C-5 | 逸脱は実装前停止 | プロセス | 割当指示 |
