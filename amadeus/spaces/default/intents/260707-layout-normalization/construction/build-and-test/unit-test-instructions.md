# Unit Test Instructions — Workspace Layout Normalization

## Upstream Inputs

この unit test 方針は、各 unit の `code-generation-plan` と `code-summary` に基づく。すべての unit は documentation-only と記録されており、新規 runtime behavior や testable TypeScript module は追加していない。

## Test Scope

今回の unit test は、docs 参照の退行を検出する existing unit test を targeted に実行する。

対象:

- `tests/unit/t174-docs-legacy-refs-gate.test.ts`

対象外:

- 新規 unit test file の追加。
- implementation detail の assertion。
- live SDK/TUI を使う test。

## Command

```bash
bun tests/run-tests.ts --unit --filter t174-docs-legacy-refs-gate
```

## Expected Coverage

期待する確認:

- docs 配下と authored prose surface に、退役済み legacy ref が未許可で混入していない。
- allowlist が blanket allowlist になっていない。
- allowlist が stale entry を保持していない。

## Test Data

既存 fixture `tests/fixtures/docs-legacy-refs.json` を使う。今回の変更では fixture 更新は不要。
