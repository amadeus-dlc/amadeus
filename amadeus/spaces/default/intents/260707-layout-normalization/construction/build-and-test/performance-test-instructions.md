# Performance Test Instructions — Workspace Layout Normalization

## Upstream Inputs

この performance test 方針は、各 unit の `code-generation-plan` と `code-summary` に基づく。今回の unit は documentation-only で、runtime path、I/O path、test runner、packaging algorithm の実装変更を含まない。

## Applicability

今回、performance test は不要。

必要になる条件:

- directory walk、manifest expansion、distribution generation の algorithm を変更した場合。
- test runner parallelism や live TUI execution path を変更した場合。
- workspace layout 変更により packaging/self-promotion の所要時間が増える可能性がある場合。

## Command

今回の diff では performance command は実行しない。layout contract の drift は次で代替確認する。

```bash
bun run dist:check
```

## Expected Coverage

期待する確認:

- performance-sensitive implementation が変更されていないため、新規 benchmark baseline は不要。
- 将来 source root abstraction を実装する場合は、`scripts/package.ts` の directory traversal と manifest projection を重点的に測る。

## Test Data

追加 performance fixture は不要。
