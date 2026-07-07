# Integration Test Instructions — Workspace Layout Normalization

## Upstream Inputs

この integration test 方針は、各 unit の `code-generation-plan` と `code-summary` を確認して作成した。今回の変更は docs/design-only で、CLI runtime flow、state machine、packaging implementation、test harness implementation を変更していない。

## Test Scope

今回、新規 integration test は不要。

必要になる条件:

- `scripts/package.ts` や `scripts/promote-self.ts` を変更した場合。
- `core/`, `harness/`, `dist/`, `.claude/.codex/.agents` の runtime surface を移動または再定義した場合。
- `/amadeus` の stage routing、intent layout、scope grid 実行 semantics を変更した場合。

## Command

今回の diff では targeted integration command は実行しない。代替として、integration boundary に近い guard を次で確認する。

```bash
bun run dist:check
bun run promote:self:check
```

## Expected Coverage

期待する確認:

- root-level framework layout の decision が generated distribution contract を壊していない。
- self-install targets が generated distributions と同期している。
- `packages/setup` を sibling package とする説明が runtime flow 変更を要求していない。

## Test Data

追加 fixture は不要。既存 committed `dist/*` と root self-install targets を検証対象にする。
