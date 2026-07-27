# Security Test Instructions — 260726-t258-p95-flake

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-t258-p95-flake/code-generation/ — 検証対象と実測 exit code の導出元)。

## 対象変更のセキュリティ回帰(target-scoped)

tests/ のみの変更で認可・入力境界・秘密情報に非接触(code-summary.md の変更ファイル一覧)。fail-closed 述語(空列・非有限 → fail)は偽グリーン方向の劣化を構造的に防ぐ。

## リポジトリ全体の依存 audit

別判定。依存追加ゼロのため新規 advisory なし。既存 advisory の棚卸しはスコープ外。
