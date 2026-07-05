# Build Instructions（260705-github-kanban-sync）

上流入力: [code-summary.md](../u002-kanban-sync-cli/code-generation/code-summary.md)、[business-rules.md](../u002-kanban-sync-cli/functional-design/business-rules.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 手順

ビルド工程は存在しない（Bun が TypeScript を直接実行する）。検証入口は次の 1 コマンドである。

```sh
npm run test:all
```

## 適用判断

コンパイル成果物を作らない repo-local スクリプト群のため、ビルド手順は「検証入口の明示」だけを内容とする（Testing Posture の規約に従う簡潔文書）。
