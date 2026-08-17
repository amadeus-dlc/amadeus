# Build Instructions — intent 260816-priority-bug-batch-3

## ビルド手順

- 各 Bolt worktree で `bun install` → `bun run build`(正本 `packages/framework/core/` / `packages/framework/harness/<name>/` から未追跡の `dist/` とセルフインストール面を再生成)。全5レーン(b1〜b5)で実施済み(worktree セットアップの定型 — cid:code-generation:solo-bolt-worktree-required)
- 追跡ファイル不変の確認は各レーンの `git status --porcelain` で実測(record 面を除きコード変更のみ)
- 隔離2回ビルドの再現性検査・source-only 境界検査・グラフ不変量検査は **CI を正**とする(ローカル手動チェックリストでの代替は Forbidden)— 各 Bolt PR(#3171 / #3172 / #3173 / #3174 / #3175)の必須 CI に含まれる

## 検証境界

- ブロッキング集合の正本は CI の `ci-success` 集約ジョブ(cid:code-generation:c1-2814-aggregate-needs-is-blocking)
- ローカルは typecheck(`bun run typecheck`)/ lint(Biome)/ 対象テストまで(remote-first — team.md 裁定)
