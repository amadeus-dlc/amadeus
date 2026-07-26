# Performance Test Instructions — 260726-grant-scope-gate

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

## 選定判断

承認済み要件(requirements.md)に性能 NFR は存在しない。code-summary.md の変更は per-gate 判定 1 回あたり scope-grid の読取(既存 loadScopeMapping、プロセス内キャッシュ既習様式)に置き換えるのみで、ホットパスではない(ゲート解決は人間承認境界の頻度)。

戦略名だけを根拠にした負荷試験の機械追加は行わない(cid:build-and-test:bt-proportional-selection)。生成しなかった検査: 負荷試験・レイテンシ測定 — trace 可能な承認済み性能 NFR が不在のため。

## 実施

N/A(反証可能な非適用根拠: requirements.md の NFR 節に性能項目なし)。
