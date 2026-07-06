# performance-test instructions（260706-rename-lint-fixes）

上流入力: [code-summary.md](../rename-lint-fixes/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

性能特性を変える変更はない。sensor の lint:check ラップは実測 0.7 秒（repo の `npm run lint:check`）で、dispatcher の timeout_seconds: 30 に収まることを code-generation で実測済み。専用の performance-test 工程は不適用と判断する。
