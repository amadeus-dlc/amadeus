# Tech Stack Decisions — u003-kanban-hooks

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)、[business-rules.md](../functional-design/business-rules.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 要求

既存 hooks 基盤（Claude Code の PostToolUse / Stop / SessionEnd）に repo-local 設定で結線する（D-AD9）。実装は Bun + TypeScript のみで npm 依存を追加しない（N4）。実装先は `dev-scripts/kanban/hooks/` に限定し、Amadeus 本体（`.claude/hooks/` symlink = parity 対象）へ置かない（N5 / C02 / D-AD9）。PROJECT_DIR 解決は CLAUDE_PROJECT_DIR 優先（BR-8）。新規技術なし。

## 根拠と検証

requirements.md の N4 / N5 を本 Unit へ具体化したものであり、新しい技術判断は追加しない。検証は settings.json の diff レビュー（BR-6 / BR-7）で行う。
