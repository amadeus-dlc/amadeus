# Build and Test Results — 260814-t528-ambient-isolation

> 実測 ref: 本 worktree HEAD `c4f85b30cd322de1f6aeb73ac0e6198f04b70aae`(= PR #3000 head)。すべて実行出力からの転記。ログ一次保存先はセッション scratchpad(`full-suite.log` / `typecheck.log` / `lint.log`)。

## 結果(確定値)

| コマンド | 結果 |
|---|---|
| `bash tests/run-tests.sh --ci`(フルスイート) | **exit 0 / RESULT: PASS** — Total assertions 13362 / Failed 0(サイズ行列: small 261 / medium 706 / large 1) |
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0 |
| 対象テスト単独(env なし / `CLAUDE_PROJECT_DIR=$PWD`) | exit 0 ×2、7 pass / 0 fail(conductor 実測、code-summary.md 転記) |

- conductor がフルスイートを1回通した(テストファイル変更を含む変更のため — cid:code-generation:c3-conductor-runs-full-suite)。フルスイート実行中に coverage を触る並行コマンドは実行していない(単独所有)。
- wall-clock drift 警告 14 件(declared=medium measured=large)は advisory であり、いずれも本 intent の非変更ファイル。RESULT: PASS に影響なし。

## ビルド

- `packages/framework/core/` 不変のため追跡ファイルへ影響する再ビルドなし。worktree 初期化時の `bun run build` 済み(dist / self-install 面生成、t528 の前提検査が要求する stage-graph.json 実在)。

## 未検証面(申し送り)

- PR #3000 の CI(GitHub Actions の必須 check 集合)は未確定 — pr-convergence ステージで実測する。
- FR-5(Issue #2981 への機序 B 実測追記、E2 別 Issue 起票)は gh create/comment の人間承認境界により未実施(ドラフト提示待ち)。いずれも requirements の受け入れ基準上、コード面の green とは独立。
