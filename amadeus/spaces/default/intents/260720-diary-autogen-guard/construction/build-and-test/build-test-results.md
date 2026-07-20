# Build & Test Results — 260720-diary-autogen-guard

上流入力(consumes 全数): code-generation-plan.md、code-summary.md

> 測定 ref: bolt head `9d99ce9ee`(base `d85dc3d65`、PR #1288)。

## 結果一覧(全て実行結果由来)

| 検査 | 実行環境 | 結果 |
|---|---|---|
| typecheck / lint / dist:check / promote:self:check / coverage:ci / patch gate | bolt worktree | 全 exit 0 |
| bash tests/run-tests.sh --ci | bolt worktree | exit 0(389 files / 5521 assertions / Failed 0 — 初回 registry drift は regen 定型で解消) |
| 落ちる実証(構造面) | bolt worktree | base 復帰 → 新テスト赤 → fix SHA 復元 → 緑・tree clean |
| 落ちる実証(挙動面) | bolt worktree | advisory 無音化注入 → 該当 assertion のみ赤(他 5 pass 維持)→ 復元 clean |
| 閉包 | bolt worktree | バグ前提再現(relativeRecordDir null 実測)で不変条件 HELD(exit 0) |
| レビュアー独立実測(e2) | PR #1288 | dist 面切替で赤1→緑6 の独立再現+親 tree 非汚染+main 包含性 |
| lcov | bolt worktree | patch 20/20 covered(advisory 行 DA 121 hits) |
| conductor 裏取り | scratch worktree | 対象2ファイル 10 pass / 0 fail、three-dot 25 files +934/-70 |

## 判定分離

- PASS: 上表全項目
- N/A: 専用性能テスト(NFR 不在)/ 追加サニタイズ(新規入力経路なし)
- PENDING: PR #1288 の main マージ(e2 READY 済み・CI green leader 監視 → ユーザー承認 → leader 執行)
