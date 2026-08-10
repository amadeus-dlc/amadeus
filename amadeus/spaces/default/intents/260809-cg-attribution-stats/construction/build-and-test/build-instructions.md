# Build Instructions

## Upstreamと前提

4 Unitの`code-generation-plan.md`と`code-summary.md`を入力にする。Bun 1.3.13、repository root、既存lockfileを使用し、外部service・database・daemon・環境変数は不要である。source of truthは`packages/framework/core/`で、生成した`dist/`やself-install surfaceはcommitしない。

## Build手順

```bash
mise trust
bun install --frozen-lockfile
bun run build
bun run typecheck
bun run source-only:check
```

成功条件は全commandのexit 0、TypeScript error 0、source-only boundary cleanである。build後は`dist/claude/.claude/tools/amadeus-stage-attribution-report.ts`が存在し、`tests/unit/t150-codex-packaging.test.ts`が新規C-05のpackagingを検証できる状態になる。

## 検証とトラブルシュート

- `t150-codex-packaging`のENOENTはsource追加後のstale local `dist`を示す。`bun run build`後に同testを単独再実行し、生成物はstageしない。
- constrained VMでcold-compile timeoutが出た場合は、失敗fileを`bun test --timeout 120000 <file>`で単独再実行し、実装failureと負荷揺らぎを区別する。
- `bun run lint`の既存cognitive-complexity warningはexit 0 baselineであり、新規errorまたは所有fileの新規diagnosticだけを回帰とする。
