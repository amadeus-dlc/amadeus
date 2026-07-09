# Build Instructions — framework-repair-batch

> 入力: 各 unit の `construction/<bolt>/code-generation/code-generation-plan.md` と `code-summary.md`(fix-656-installation-detect / fix-657-sensor-tsc / fix-641-hook-project-dir / fix-661-glossary-note)。
> 本 intent はコンパイル成果物を持たない(TypeScript を Bun が直接実行)ため、「ビルド」= 依存導入 + 生成ツリー同期検証を指す。

## 依存導入

```sh
bun install
```

- ランタイム: Bun(リポジトリ標準)。Node/npm は不要
- 注意: main を取り込んだ直後は必ず `bun install` を再実行する — 依存が変わると `bun run typecheck` が exit 127(tsc 不在)で偽の失敗をする(本ステージ実行時に実測)

## ビルド相当の検証コマンド

```sh
bun run typecheck        # tsc --noEmit
bun run lint             # Biome(フォーマッタ無効)
bun run dist:check       # dist/<harness>/ 生成ツリーのドリフト検査
bun run promote:self:check  # セルフインストール(.claude/.codex/.agents/CLAUDE.md)の同期検査
```

すべて exit 0 が合格。`dist:check` / `promote:self:check` は fix-657/fix-641/fix-661 が core 正本を編集して生成ツリーを同一コミット同期した(各 code-summary.md 参照)ことの継続検証として必須。

## トラブルシューティング

- `typecheck` が exit 127 → `bun install` 未実行(上記)
- `dist:check` が赤 → `dist/` の手編集禁止(team.md Forbidden)。`bun scripts/package.ts` で再生成し正本との差分を確認
- `tests/run-tests.sh` 内の setup 系テストが不可解に緑/赤 → `packages/setup/dist/cli.js` のステールバイナリを削除してから再実行(team.md 学習 stale-binary)
