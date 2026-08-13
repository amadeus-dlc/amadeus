# Build Instructions — 260813-lifecycle-guard-runtime

上流入力: `construction/lifecycle-guard-runtime/code-generation/code-generation-plan.md`(12 Steps)と `code-summary.md`(変更 14 files)を対象とするビルド手順。depth Minimal のためコマンドと環境のみ。

## 前提

- Bun(パッケージマネージャ兼ランタイム)。`bun install` で依存導入。
- 環境変数・ローカルサービス: 不要(`AMADEUS_SKIP_*` はテストランナー専用 — 手動設定しない)。

## コマンド

```sh
bun install
bun run build        # packages/framework/core -> dist/<harness> 全ハーネス再生成 + self-install
bun run typecheck    # tsc --noEmit (tsconfig + tests)
bun run lint         # Biome
```

## 検証

- `bun run build` 後に `git status --porcelain` が空(追跡ファイル不変)であること。
- 実測(conductor ツリー、HEAD `62516c324`): build exit 0 / typecheck exit 0 / lint exit 0。
