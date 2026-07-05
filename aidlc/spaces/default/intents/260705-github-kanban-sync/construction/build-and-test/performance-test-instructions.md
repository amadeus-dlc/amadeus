# Performance Test Instructions（260705-github-kanban-sync）

上流入力: [code-summary.md](../u002-kanban-sync-cli/code-generation/code-summary.md)、[business-rules.md](../u002-kanban-sync-cli/functional-design/business-rules.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

性能試験は実施しない。性能要求は「hook の timeout 60 秒以内」と「PostToolUse がネットワークを持たない」だけであり、前者は walking skeleton の実測（board 確認時）、後者は kanban-hooks eval（child process / ネットワーク不在の純関数検証）で担保する（nfr-requirements の判断のとおり）。
