# Build & Test Results — 260813-remove-team-up

上流入力(consumes 全数): `construction/remove-team-up/code-generation/code-generation-plan.md`(Step 7 build、Step 8 typecheck/lint/対象テスト)、`construction/remove-team-up/code-generation/code-summary.md`(当時 54 pass / typecheck 成功。本ステージは再測と 1 件の回帰修復)。

- 測定 ref: worktree `/Users/j5ik2o/orca/workspaces/amadeus/remove-team-up.sh`、branch `remove-team-up.sh`、実装 commit `134838bf100a6a2efc2f6e658f2bc7a2f0b4a8c8`
- PR: [#2975](https://github.com/amadeus-dlc/amadeus/pull/2975) (`pr-convergence-report.md` kind: created、generated at `2026-08-13T15:08:22Z`)

## ビルド結果

| コマンド | exit | 実測値 | 測定者 |
|---|---|---|---|
| `bun run typecheck` | 0 | `tsc --noEmit` ×2 profile | 本ステージ |
| `bun run lint` | 0 | 1790 files / 465 warnings / 17 infos(既存 baseline) | 本ステージ |
| `bun run build` | 0 | 8 harness 再生成、`promote-self` 成功 | 本ステージ |

ビルド失敗は発生していない。exit はパイプ非経由で個別捕捉した。

## テスト結果

| 対象 | コマンド | exit | 実測値 | 測定者 |
|---|---|---|---|---|
| 対象 4 ファイル(修復前) | `bun test ./tests/unit/t-remove-team-up-absence.test.ts ./tests/integration/t226-migration-doctor-heartbeats.test.ts ./tests/unit/t414-glossary-projection.test.ts ./tests/integration/t414-glossary-projection.integration.test.ts` | 1 | 66 pass / 1 fail / 127 expect(4 files、246.00ms) | 本ステージ |
| 対象 4 ファイル(修復後) | 同上 | 0 | 67 pass / 0 fail / 127 expect(4 files、211.00ms) | 本ステージ |

修復前の fail: `team-up launcher absence > tracked sources are gone`。`git ls-files -- tests/**/*team-up*` が NFR-1 置換ファイル `tests/unit/t-remove-team-up-absence.test.ts` 自身を返した。期待をその 1 ファイルの allowlist に直し、同一コマンドを再実行して green。

quality-repair: 修復前 `observe-quality` → `repair`(`sha256:cbea9065443cbd65ab33f627ac6b1a3d9a2bf55a88a601b5a2bb1a1bc084691d`)。修復後 → `READY`(`sha256:5960b44942b4cab998d596092c59f0eda3764ec0e165b580d89000d9575920c0`)。

## 不在確認

| 検査 | 結果 |
|---|---|
| `git ls-files -- packages/framework/core/tools/team-up.sh` | 空 |
| `git ls-files -- packages/framework/core/tools/team-up-codex-safety-wait.ts` | 空 |
| `.claude/tools/team-up.sh`(build 後) | 不在 |
| `t266` / `t267` ランチャ駆動ファイル | 追跡なし |

## FR / NFR 別の受け入れ確認

| 要件 | 受け入れ確認 | 実測証拠 | 判定 |
|---|---|---|---|
| FR-1 | `team-up.sh` が `git ls-files` に無い | 本ステージ ls-files 空、absence テスト pass | ✅ |
| FR-2 | safety-wait 正本が無い | 同上 | ✅ |
| FR-3 | CI が存在しない `team-up.sh` を spawn しない | 名前付き `*team-up*` 残件は absence テストのみ | ✅ |
| FR-4 | doctor が死んだ CLI を推奨しない | absence + t226 10 pass | ✅ |
| FR-5 | live `team-up.sh` レシピが docs に無い | absence ガイド走査 + t414 投影 | ✅ |
| FR-6 | 生成面は build のみ。self-install から消える | `bun run build` exit 0、`.claude/tools/team-up.sh` 不在 | ✅ |
| FR-7 | `team-msg.sh` 残置 | 本 Intent は当該ファイルを削除していない(code-summary) | ✅ |
| FR-8 | bash 空配列ガードを実装しない | ランチャ経路無し。クラッシュ修正差分なし | ✅ |
| NFR-1 | 不在回帰 1 本以上 | `t-remove-team-up-absence.test.ts` 3 pass | ✅ |
| NFR-2 | ソロ `/amadeus` を変えない | 変更面はランチャ・docs・doctor・テスト | ✅ |
| NFR-3 | typecheck / lint / build | いずれも exit 0。隔離 2 回 byte-identical は本ステージ未再測(CI の責務、申し送り) | ✅(局所) |

## Verdict

**READY(条件付きではない)。** 対象受け入れは fresh evidence あり。下記は AC 外。

## 申し送り(AC 外)

1. **フルスイート `bun run test:ci` は本 tree で未完走。** 対象 4 ファイルと typecheck/lint/build を正とする。
2. **隔離 2 回 build の byte-identical は CI ジョブの責務。** 本ステージは 1 回 `bun run build` のみ。
3. **関連 Issue #1250 / #998 / #1136 / #1087 の GitHub close はコード成果物ではない。**
4. **PR #2975** は実装 commit `134838bf1` で作成。absence glob 修復と本ステージ成果物は後続 commit で head を更新する。
