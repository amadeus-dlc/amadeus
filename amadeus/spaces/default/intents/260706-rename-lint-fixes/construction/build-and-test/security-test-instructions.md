# security-test instructions（260706-rename-lint-fixes）

上流入力: [code-summary.md](../rename-lint-fixes/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 適用判断

認証情報・外部入力境界に触れる変更はない。sensor が実行するのは workspace 自身の package.json が宣言する lint:check script であり、外部入力ではなく workspace 所有者の宣言に基づく（エンジンの既存 sensor 実行モデルと同じ信頼境界）。専用の security-test 工程は不適用と判断する。
