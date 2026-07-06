# Performance Test Instructions（260705-jump-phase-guard）

上流入力: [code-summary.md](../jump-phase-guard/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

性能試験は実施しない。追加処理は jump 実行時の phase 列挙とファイル存在確認（高々 5 phase × 1 stat）であり、対話 CLI の実行時間に対して無視できる。
