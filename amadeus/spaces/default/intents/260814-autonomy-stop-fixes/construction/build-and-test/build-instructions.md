# Build Instructions — 260814-autonomy-stop-fixes

上流入力: `construction/issue-2974-error-arm-boundary/code-generation/code-generation-plan.md` と `code-summary.md`(本 intent の唯一の unit。変更はプロトコル文書・ハーネス表層・docs と integration テスト1本で、production TypeScript の追加行は 0)。

## 依存とビルド

- 依存: `bun install`(Bun 1.3.13、lockfile 準拠。追加依存なし)
- ビルド: `bun run build` — packager が manifest 発見の全ハーネス(8面)の `dist/` とセルフインストール面を再生成する。`packages/framework/core/` / `plugins/` の変更後は必須
- 環境変数: 不要(テストは `TEST_TIME_FACTOR` を respec するが既定でよい)

## 検証コマンド

- `bun run typecheck`(tsc --noEmit)/ `bun run lint`(Biome)
- `bun run source-only:check` / `bun run distribution:check`(配布 drift)
- ビルド後の配送先述語(code-summary.md の実測と同じ): `grep -rl 'do not invent a new question or a new gate' dist/ | wc -l` = 16 面
