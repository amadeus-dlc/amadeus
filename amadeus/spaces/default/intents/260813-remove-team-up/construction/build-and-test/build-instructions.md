# Build Instructions — 260813-remove-team-up

上流入力(consumes 全数): `construction/remove-team-up/code-generation/code-generation-plan.md`(Step 7 が `bun run build`、Step 8 が typecheck / lint / 対象テスト)、`construction/remove-team-up/code-generation/code-summary.md`(検証: `t-remove-team-up-absence` / `t226` / `t414`、`bun run typecheck`、lint baseline、`git ls-files '*tools/team-up.sh'` 空)。

- Depth: Minimal(`amadeus-state.md` の `**Depth**: Minimal`) — コマンドと環境変数に限定し、troubleshooting 節は Step 10 でビルドが失敗した場合のみ置く。本ステージではビルド失敗が発生しなかったため置かない。
- 測定 ref: worktree `/Users/j5ik2o/orca/workspaces/amadeus/remove-team-up.sh`、branch `remove-team-up.sh`、実装 HEAD `134838bf100a6a2efc2f6e658f2bc7a2f0b4a8c8`、PR [#2975](https://github.com/amadeus-dlc/amadeus/pull/2975)。

## 前提と依存導入

```
bun install --frozen-lockfile
```

変更面は `packages/framework/core/` の正本削除と doctor / 文書 / 回帰テストであるため、配送面は `bun run build`(`dist` + `promote:self`)で再生成する。生成面は手編集しない(FR-6、code-generation-plan.md Step 7)。

## 環境変数

| 変数 | 用途 | 必要な場面 |
|---|---|---|
| (なし) | 日常の typecheck / lint / 対象テスト / build | 常時 |

Team Mode ランチャは削除済みのため、Codex `trust_level` 修復に `team-up.sh` は使わない。doctor は手動で `trust_level = "trusted"` を案内する(FR-4)。

## ビルド・検証コマンド

```
bun run typecheck
bun run lint
bun run build
```

実測(本ステージ、パイプ非経由・exit 個別捕捉):

| コマンド | exit | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | `$ tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.tests.json` |
| `bun run lint` | 0 | `Checked 1790 files in 985ms. No fixes applied. Found 465 warnings. Found 17 infos.`(warning/info は既存 baseline。本 Intent の変更で error は出ていない) |
| `bun run build` | 0 | `bun scripts/package.ts` が 8 harness を再生成し、`promote-self: project-local self install updated`。`.claude/tools/team-up.sh` は不在 |
