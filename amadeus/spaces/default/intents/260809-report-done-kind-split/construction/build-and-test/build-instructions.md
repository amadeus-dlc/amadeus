# Build Instructions — 260809-report-done-kind-split

上流入力: `construction/fix-2762-done-terminal/code-generation/code-generation-plan.md`(実装ステップの正本)と同 `code-summary.md`(本 unit の実装が PR #2767 / squash `34888d840` で `main` へ着地済みであること、および FR 別の着地面実測)。本 intent はコード変更を持たないため、以下は「現行 `main` 断面を再現し、着地面を再検証できる状態にする」ための手順である。

## 前提

- **bun**(1.3.x 系。本実測は 1.3.13)。非対話シェルの PATH に載っていること
- リポジトリのクリーンな checkout。本実測の tree は `e7c0515fec217a589035e8ba0aef814599ad34a2`(`origin/main` 断面)
- 環境変数: `TEST_TIME_FACTOR=2`(CI 既定値)。より低速な環境では `3`
- `gh` CLI(配送検証で PR / Issue 状態を引くときのみ。ビルド自体には不要)

## コマンド

```
bun install                 # 依存の導入(本実測では変更なし)
bun run build               # dist/<harness> とセルフインストール面の再生成
```

`bun run build` = `bun scripts/package.ts` + `bun scripts/promote-self.ts --apply`。`packages/framework/core/` と `packages/framework/harness/<name>/` が正本で、`dist/` とセルフインストールツリーは未追跡の生成物。

## ビルド検証

```
git status --porcelain --untracked-files=no    # 追跡ファイルの drift が無いこと
bun run typecheck                              # tsc --noEmit ×2 プロジェクト
bun run lint                                   # biome check
bun run source-only:check                      # source-only 境界
```

本実測の結果は `build-test-results.md` に記録する。
