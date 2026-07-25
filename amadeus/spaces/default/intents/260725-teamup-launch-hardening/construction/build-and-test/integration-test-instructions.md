# 統合テスト手順 — 260725-teamup-launch-hardening

上流入力（consumes 全数）: `construction/u1-watcher-actas-guard/code-generation/code-generation-plan.md`、`construction/u1-watcher-actas-guard/code-generation/code-summary.md`、`construction/u2-worktree-parallel/code-generation/code-generation-plan.md`、`construction/u2-worktree-parallel/code-generation/code-summary.md`

## 本 intent のテスト資産

| テスト | 行数 | 対象 | 由来 |
|---|---|---|---|
| `tests/integration/t294-team-up-watcher-applicability.test.ts` | 113 | U1: 適用可否ガードの分岐 | 前 intent で新設、本 intent の U1 で書き換え |
| `tests/integration/t-team-up-watcher-arming.test.ts` | 268 | watcher arming の待機・再送 | 既存 |
| `tests/integration/t295-team-up-worktree-parallel.test.ts` | 273 | U2: 並列化・完了照合・ロールバック | 本 intent で新設 |

いずれも実 FS・実 git を使うため integration 層に置く（`cid:code-generation:fs-tests-integration-first`）。

## U1 のテスト観点

- 起動プロンプトが actas 形のとき検証が**適用される**こと
- monitor 形のとき**スキップし、その理由を stderr へ出す**こと（黙って通さない）
- スキップの表明が **1 回だけ**であること — `watcher_verification_applies` は launch 経路に2箇所あるため、ラッチが無いと2行出る（`cid:code-generation:guard-announcement-callsite-count`）

## U2 のテスト観点

- 並列度が上限 4 を**超えない**こと、かつ**実際に並列である**こと（開始/終了マーカーの重なりから peak concurrency を実測する両側検査）
- `git worktree add` が checkout で失敗してディレクトリだけ残った場合を**成功と判定しない**こと（`git worktree list --porcelain` の登録照合）
- ロールバックが 3 層限定（起点・名前・深さ）で歩き、無関係な worktree を消さないこと

## 実行

```bash
bun test tests/integration/t295-team-up-worktree-parallel.test.ts \
         tests/integration/t294-team-up-watcher-applicability.test.ts \
         tests/integration/t-team-up-watcher-arming.test.ts
```

複数パスを列挙する際は、実行後に runner の `Ran ... across M files` が期待ファイル数と一致することを照合する — Bun は不存在パスを無音で除外して exit 0 になりうる（`cid:build-and-test:test-path-set-completeness`）。
