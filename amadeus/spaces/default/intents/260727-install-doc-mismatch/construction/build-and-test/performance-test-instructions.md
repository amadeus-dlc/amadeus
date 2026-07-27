# Performance Test Instructions — 260727-install-doc-mismatch

上流入力(consumes 全数): code-generation-plan.md、code-summary.md。

## 判定

**N/A(反証可能な非適用根拠)** 本 intent の要件(requirements.md FR-1〜FR-5 / NFR-1〜3)に性能 NFR は存在せず、変更は文言・定数昇格・テストのみで実行時挙動不変(NFR-1、code-summary.md で実測確認済み)。
## 既存ゲートの維持

既存の plugin discovery 性能ゲート(plugin-discovery-overhead-gate)は CI で維持され、本変更はその母集団に影響しない。戦略名を根拠にした負荷試験の機械追加はしない(cid:build-and-test:bt-proportional-selection)。
