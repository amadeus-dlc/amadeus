上流入力(consumes 全数): code-generation-plan, code-summary

# Build Instructions — 260725-kimi-harness

全 unit の code-generation-plan/code-summary を分析したビルド手順。本 intent はライブラリ/CLI の変更で、ビルドステップは「TypeScript の型検査 + 生成物の再生成」に集約される。

## 依存のセットアップ

- 前提: bun on PATH(全てのツール・テストは bun で直接実行。新規のランタイム依存なし — 全 unit の code-summary どおり)
- 初回のみ: `bun install`(node_modules が無い worktree の場合)
- 環境変数: 通常の検証では不要。live journey のみ `AMADEUS_KIMI_PRINT_LIVE=1`(+任意で `AMADEUS_KIMI_BIN`・`AMADEUS_KIMI_MODEL`・実機 `kimi login` — B6 の code-summary)

## ビルド(再生成)

```sh
bun run typecheck          # tsc --noEmit(全ファイル)
bun scripts/package.ts kimi    # dist/kimi 再生成
bun scripts/package.ts         # 全 harness 再生成
bun run promote:self           # ルート self-install 再生成
```

## ビルド検証

```sh
bun scripts/package.ts kimi --check   # byte-parity
bun run dist:check                     # 全 harness の drift guard
bun run promote:self:check             # self-install の drift guard
bun run lint                           # Biome
```

## トラブルシューティング

- `--check` が DIFFERS を出す: 正本(packages/framework)と dist のどちらが新しいか確認し、正本を直して再生成(dist は手編集しない — 全 unit の BR どおり)
- 型エラーが dist 配下に出る: 正本側を直して再生成。dist 配下の直接編集は drift を生む
- live journey が skip される: `AMADEUS_KIMI_PRINT_LIVE=1` と kimi バイナリの実在を確認(skipReason の出力どおり)
