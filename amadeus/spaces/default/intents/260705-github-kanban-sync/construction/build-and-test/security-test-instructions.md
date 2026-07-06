# Security Test Instructions（260705-github-kanban-sync）

上流入力: [code-summary.md](../u002-kanban-sync-cli/code-generation/code-summary.md)、[business-rules.md](../u002-kanban-sync-cli/functional-design/business-rules.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

専用のセキュリティ試験は実施しない。認証は gh CLI へ全面委譲しトークンに触れず、queue / drops.log の書き込み値が dirName と定型文に限られることは kanban-hooks eval の書式検証でカバーする（security-requirements の判断のとおり）。
