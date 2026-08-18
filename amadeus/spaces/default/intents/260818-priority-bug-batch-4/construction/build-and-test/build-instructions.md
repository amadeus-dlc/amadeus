# Build Instructions — 260818-priority-bug-batch-4

depth = Minimal。本 intent は既存リポジトリ標準のビルド面だけを使い、新規のビルド機構・CI ジョブ・ツールを一切追加しない(application-design の reuse inventory どおり)。上流入力は 2 unit の `code-generation-plan.md` と `code-summary.md`。

## コマンド

すべて対象 worktree のルートで実行する。

- 依存: `bun install --frozen-lockfile`
- ビルド(全ハーネス投影 + self-install): `bun run build`
- 型検査: `bun run typecheck`(`tsc --noEmit -p tsconfig.json` と `-p tsconfig.tests.json` の 2 本)
- lint: `bun run lint`(Biome。フォーマッタ無効)
- 境界検査: `bun run source-only:check`

## 本 intent 固有の確認点

両 unit とも `packages/framework/core/tools/amadeus-orchestrate.ts` を変更するため、`cid:build-and-test:bt-ledger-resync` の 2 台帳を同一変更で resync 済みであることをビルド前提として扱う。

- `amadeus/spaces/default/specs/tla/model-map.json` の実装ハッシュピン(是正: `bun plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts updateModelMap --impl-only`)
- `tests/.coverage-patch-allowlist.json` の意味的セレクタ(署名行が動いた場合の再アンカー)
- 新規テストファイルを追加した unit は `bun tests/gen-coverage-registry.ts` の regen を同梱(`cid:build-and-test:c1`)

`bun run build` は未追跡の `dist/` と self-install 面を再生成する。追跡ファイルは不変であること(`git status --porcelain` の前後比較)。**Unit 1 の `t425` は `dist/<harness>/` の投影テキストを読むため、ハーネス面の prose を変更したら build 後に検証する**(ソース断面だけの green は投影の退行を隠す — `cid:requirements-analysis:c2-acceptance-at-delivery-tree`)。

## トラブルシューティング

depth = Minimal のため通常は本節を省略するが、本ステージ中に実際にビルド系の失敗を観測したため記録する。

- `sed -i '' <script>` が `can't read <script>: No such file or directory` で失敗する場合、この環境の `sed` は GNU 系で `-i` が引数を取らない。`perl -i -pe` を使う。
- zsh ではクォートなしの `$VAR` が語分割されないため、`FILES="a b c"; for f in $FILES` は 1 回だけ不正パスで回る。ファイル集合の走査は必ず配列(`files=(a b c); for f in "${files[@]}"`)で書く。この誤りは grep を全件 0-hit の偽陰性にする(`cid:reverse-engineering:c6-absence-predicate-exit-code` の同族)。
