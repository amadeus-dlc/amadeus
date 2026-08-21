# Build Instructions — 260821-fmc-retirement

上流入力: `construction/fmc-retirement/code-generation/code-generation-plan.md`(実装計画・裁定表)、`construction/fmc-retirement/code-generation/code-summary.md`(実装実測・追補 1/2)。

## 依存インストール

```bash
bun install --frozen-lockfile
```

- ランタイムは Bun 単独(利用者側 Bun-only 前提は不変 — 本 intent は依存を**削減**した: mise の JDK ピンを除去、TLA+/TLC 系ツールチェーンへの参照を全廃)

## 環境セットアップ

- 追加の env 不要。テスト実行時は `TEST_TIME_FACTOR`(CI 既定 2)が timeout スケーリングに使われる
- ローカルでフルスイートを回す場合は `amadeus/spaces/<space>/intents/active-intent` カーソルを退避する(cid:code-generation:c2-260809-otel-cursor)
- **本 intent の実測教訓**: 実 repo 内での `git commit` は lefthook `related-unit-tests` を実行し、テスト漏出(t209)が共有 git config(`core.bare`/`user.*`)と HEAD を汚染した事例あり。record 系コミットで再発した場合は config/HEAD を実読検査する(本文は code-summary.md 参照)

## ビルド

```bash
bun run build
```

- 正本 `packages/framework/core/` + `packages/framework/harness/<name>/` から未追跡の `dist/` とセルフインストール面を再生成する
- FMC 退役後の期待: `dist/` 配下に formal-model-check の投影が**存在しない**こと(distribution:check が 458 payloads / 462 files で green — 実測は build-test-results.md)

## ビルド検証

```bash
bun run typecheck          # tsc --noEmit ×2(main + tests)
bun run lint               # Biome
bun run source-only:check  # source-only 境界
bun .claude/tools/amadeus-graph.ts compile --check   # graph 不変量 (i)-(v)
bun .claude/tools/amadeus-runner-gen.ts check        # stage-runner 同期(30 runners)
bun run distribution:check # 配布 drift
bun tests/gen-coverage-registry.ts --check           # coverage registry freshness
```

## 既知のトラブルシューティング

- 隔離 2 回ビルドの再現性検査はリモート CI 正本(ローカル代替不可 — Forbidden 節)
- マージ取込直後の registry regen は必ず `bun run build` の後に行う(stale dist は enumeration universe を欠落させる — cid:code-generation:c5-regen-needs-build)
