# Code Generation Plan — U4 doctor-drift-check

## 上流入力

`functional-design/`、`nfr-requirements/`、`nfr-design/`、U1 registry row 契約を入力とする。

## 実装対象

- `packages/framework/core/tools/amadeus-utility.ts`: elections registry drift の advisory doctor check
- 全 harness mirror と dist 配布物
- label/predicate unit tests と real filesystem integration tests

## 検証

focused tests、`bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bun run test:ci` を実行する。
