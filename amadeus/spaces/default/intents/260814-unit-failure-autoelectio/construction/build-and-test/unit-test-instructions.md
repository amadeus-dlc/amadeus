# Unit Test Instructions — Issue #2976

上流: `construction/unit-failure-autoelectio/code-generation/code-generation-plan.md` と `code-summary.md`。

## 実行方法

```bash
bun test --timeout 120000 tests/unit/t113.test.ts tests/unit/t211-swarm-batch-progress.test.ts
```

各テストは一時workspaceを所有し、共有状態や実行順序へ依存しない。

## 期待する検証範囲

- auto / manual / 未設定 / invalid config とintent層優先。
- `execute-failure-election` directiveの形状とcanonical choices。
- Retry / Skip / Abortの既存ruling経路とaudit event連鎖。
- rulingなしでworkflowが前進しないfail-closed性。
