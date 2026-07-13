# Driver Contract & Selection Policy Tech Stack Decisions

## 上流とbrownfield制約

本成果物は`business-logic-model.md`、`business-rules.md`、`requirements.md`、CodeKB `technology-stack.md`を消費する。U-01は既存Bun/TypeScript framework coreへembeddedし、新しいservice、database、cloud SDK、daemonを追加しない。

## Decision table

| Concern | Decision | Rationale | Rejected |
|---|---|---|---|
| language | TypeScript ESM、現行compiler pin | closed union、readonly/frozen value、既存core parity | Rust/native addon、JS別実装 |
| runtime | repository既定のBun | `.ts`直接実行、`bun:test`、全harness同一 | Node専用runtime、常駐process |
| domain model | class-free type + companion factory + immutable value object | 現行functional-domain-modeling、invalid state排除 | mutable class hierarchy、stringly map |
| schema | versioned closed JSON schema、`additionalProperties=false` | harness間contract/redaction | permissive catch-all、runtime plugin schema |
| property tests | fast-check `^4.9.0`既存devDependency | env/topology/order/invalid state探索 | 新PBT library、自作random |
| example tests | `bun:test` + repository test runner | CI/coverage/test-size統合 | Jest/Vitest追加 |
| quality | `tsc --noEmit`、Biome、lizard/coverage ratchet | 既存CI gate | 新linter/formatter |
| dependencies | node標準libraryのみ、runtime dependency 0件追加 | pure policy/supply-chain最小化 | env/schema/plugin package追加 |

## Placement

- authored source: `packages/framework/core/tools/`のcontract/selector module。
- harness固有prose: selection ruleを実装せずC-01 projectionだけ。
- generated trees: `scripts/package.ts`経由で同期し直接編集しない。
- test: unit/property/schema/compile fixtureを既存`tests/` tierへ配置する。

## Security and portability

Bun/TypeScript/fast-checkはlockfileで固定し、CIはfrozen installを使う。OS API、shell、network、filesystemへ依存しないためmacOS/Linuxで同じfixture digestを要求する。Windows supportは今回表明しないが、不要なplatform分岐も追加しない。

## Decision consequences

closed TypeScript contractはdriver追加時にcompile/test/docs変更を要求する一方、未知pluginを無停止で追加できない。この制約はU-01の決定性とrelease completenessを優先した意図的なtradeoffである。

