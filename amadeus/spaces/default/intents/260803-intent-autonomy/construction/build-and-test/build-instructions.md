# Build Instructions — intent-autonomy

## 入力と前提

本手順は、U1 `loop-monitor-runtime`、U2 `quality-repair-runtime`、U3 `intent-autonomy-runtime`、U4 `autonomy-review-observability`、U5 `five-harness-intent-completion` の各 `code-generation/code-generation-plan.md` と `code-generation/code-summary.md` を入力とする。Test Strategy は `Comprehensive`、実行環境は Bun 1.3.13 の短命CLI monorepoであり、常駐service、database、外部supervisorは不要である。

正本は `packages/framework/core/` と `packages/framework/harness/` である。`dist/` やroot harness suffixを手編集せず、package generatorとself-promotion drift guardで検証する。

## 依存関係と環境準備

```sh
bun install --frozen-lockfile
```

通常の決定論的検証に外部credentialは不要である。U5のlive seamだけは `AMADEUS_INTENT_COMPLETION_LIVE=1` と5 harness分のattestationをすべて必要とし、欠落時は明示的skipかつ `AWAITING_HUMAN` とする。

## Build commands

依存のない検証群は並列実行できる。

```sh
bun run typecheck
bun run lint
bun tests/gen-coverage-registry.ts --check
bun run source-only:check
bun run distribution:check
bun run promote:self:check
git diff --check
```

typecheck、source-only、distribution、promotion、whitespaceはexit 0を必須とする。lintの既存cognitive-complexity warningは許容するがerrorは許容しない。`bun scripts/package.ts --check`はrebase先で廃止されたため使用せず、再現可能buildの正規drift guardを使う。

## Build verification

- canonical audit Event Registry、coverage registry、state-machine referenceがU1〜U5の追加eventと同期している。
- Claude Code、Codex、Cursor、OpenCode、Kimi Codeの現行5 harnessが同じCoreを消費する。
- Kiro / Kiro IDEはpackage registryに保持するが、live受入cohortへ追加しない。
- PR、merge、GitHub、外部runner / supervisorをCoreのbuild依存へ混入させない。

## Troubleshooting

- cold compileでtimeoutしたtest fileは `bun test --timeout 120000 <file>` で単独再実行し、assertion failureとwall-clock driftを区別する。
- distribution driftは`bun run source-only:check`と`bun run distribution:check`のpath単位で追跡し、`dist/`を直接修正しない。
- live attestation不足を成功に変換せず、外部検証残として記録する。
