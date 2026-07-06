# Integration Test Instructions（260705-github-kanban-sync）

上流入力: [code-summary.md](../u002-kanban-sync-cli/code-generation/code-summary.md)、[business-rules.md](../u002-kanban-sync-cli/functional-design/business-rules.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

GitHub Projects v2 との結合試験は自動化しない。理由は、(1) 実 org の board を検証データで汚す、(2) 認証（project scope）が人間操作である、(3) 暫定機構に結合試験基盤を作り込まない（C07）。

## 代替

結合確認は walking skeleton の実機手順（PR #474 の確認手順: E1 / E2 → `npm run kanban:sync` → board 実表示の人間確認）で行う。CLI ガード（usage、worktree からの --all 拒否）は実機で確認済み。
