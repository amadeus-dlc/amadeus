# Build Instructions

## 上流成果物

本手順は5 Unitの `code-generation-plan.md` と `code-summary.md` を統合したもの。対象は `codex-live-walking-skeleton`、`live-e2e-common-hardening`、`claude-print-live`、`claude-sdk-live`、`claude-tui-live` である。正本は `tests/harness/live-e2e/` と各 transport facade/testであり、`dist/` は直接編集しない。

## 前提条件

- Bun 1.3.13以上
- lockfileに固定された依存関係
- TypeScript 6、Biome、既存Bun test runner
- 実provider検証を行う場合だけ、runbook記載のadapter別opt-inと短命credentialを設定する

依存関係は次で復元する。

```bash
bun install --frozen-lockfile
```

## Buildと静的検証

```bash
bun run typecheck
bun run lint
bun scripts/package.ts --check
bun run promote:self:check
bun tests/harness/live-e2e/project-matrix.ts check
```

`lint`の既存cognitive-complexity warningはbaselineとして許容するが、exit codeは0でなければならない。package/promote/matrix checkは生成物やrunbook projectionのdriftを検出する。

## トラブルシュート

- `tsc: command not found`: `bun install --frozen-lockfile`を実行する。
- live testがSKIP: adapter固有opt-inが未設定なら正常。通常検証でcredentialやmodel callを暗黙実行しない。
- matrix drift: ledgerを捏造せず、明示live runのpending-free receiptがある場合だけ`project-matrix.ts update`後に差分をレビューする。
- package drift: `packages/framework/core/`または`packages/framework/harness/`の正本を修正し、必要時だけ`bun scripts/package.ts`で再生成する。
