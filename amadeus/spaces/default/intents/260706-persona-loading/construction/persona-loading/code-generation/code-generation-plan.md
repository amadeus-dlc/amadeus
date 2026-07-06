# Code Generation Plan — persona-loading（Issue #582）

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)（FR-1〜FR-3、NFR-1〜2）。

## 実行計画

| 段 | 作業 | 対応 FR |
|---|---|---|
| 1 | §5「For subagent stages」節（L603 付近）を実体（named agent 自動読込 + 注入禁止 + artifacts/state を渡す理由付き）へ書き換え | FR-1.1 |
| 2 | §11「Context budget」の Always include 行（L834 付近）を同実体へ書き換え | FR-1.3 |
| 3 | parity-map の exceptions[] 既存 stage-protocol.md エントリへ理由統合（#582、上流フィードバック候補の旨込み） | FR-2 |
| 4 | 旧文言の残存 0 を grep 確認 + parity:check / test:all | NFR-1〜2 |
