# 技術スタック

## Runtime and Language

| 技術 | バージョン/契約 | 用途 |
|---|---|---|
| Bun | `bun-types ^1.3.13` | runtime、package manager、test runner、script execution |
| TypeScript | `^6.0.3` | core/plugin/harness/test 実装 |
| ESM | `package.json` の `type: module` | module system |
| Node-compatible stdlib | Bun 提供 | filesystem、path、child process、crypto |

## Development Dependencies

| Dependency | Version | Purpose |
|---|---|---|
| `@anthropic-ai/claude-agent-sdk` | `0.3.158` | Claude agent integration |
| `@ast-grep/napi` | `0.45.0` | structural source analysis |
| `@biomejs/biome` | `2.5.5` | lint、formatter disabled |
| `@opentelemetry/api` | `1.9.1` | telemetry API |
| `@opentelemetry/api-logs` | `0.221.0` | logs API |
| `@opentelemetry/context-async-hooks` | `2.10.0` | async context |
| `fast-check` | `^4.9.0` | property-based tests |
| `release-it` | `^20.2.1` | release automation |

## Tooling

- Type check: `tsc --noEmit`（root と tests の2 config）。
- Lint: Biome check、formatter は無効。
- Test: Bun test を包む `tests/run-tests.ts`、smoke/unit/integration/e2e の階層。
- Build: `scripts/package.ts` で harness distribution を生成し、`scripts/promote-self.ts` で self-install surface を更新。
- SCM boundary: GitHub CLI `gh`。直接 SDK や HTTP client は使わない。
- Persistence: Markdown/JSON/JSONL の local filesystem。database と long-running service はない。

## Issue #2838 Constraints

- attestation に Node/Bun の `node:crypto` を利用できるが、secret-based signature を採る場合は key lifecycle が新たな外部運用依存になる。
- 現行 audit は filesystem record であり、digest と event identity を結ぶ決定的 receipt は既存 stack 内で実装可能である。
- plugin は core module を直接 import しないため、汎用 receipt schema または process boundary contract が必要である。
- generated `dist/` と self-install surface は編集元ではなく、source 修正後の build で同期する。
